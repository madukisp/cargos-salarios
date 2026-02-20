import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VagaNotificationData {
  type: "atribuicao" | "remocao";
  analista_email: string;
  analista_nome: string;
  analista_cargo: string;
  funcionario_saiu: string;
  cargo_saiu: string;
  data_abertura_vaga: string;
  dias_em_aberto: number;
  app_url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    console.log("[DEBUG] Raw body recebido:", JSON.stringify(rawBody));

    // Lidar com ambos os formatos (direto ou dentro de 'body')
    const notificationData: VagaNotificationData = rawBody.body || rawBody;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error("[ERRO] Credenciais do Gmail não configuradas!");
      throw new Error("Gmail credentials not configured");
    }

    if (!notificationData.analista_email) {
      console.error("[ERRO] Email do analista não fornecido!");
      throw new Error("Email do analista não fornecido");
    }

    console.log(`[INFO] Enviando email para ${notificationData.analista_email} via Gmail SMTP`);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Olá, ${notificationData.analista_nome}</h2>
        <p>Uma nova vaga foi atribuída a você no sistema de Gestão de Vagas.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1f2937;">Detalhes da Vaga</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 10px;"><strong>Cargo:</strong> ${notificationData.cargo_saiu}</li>
            <li style="margin-bottom: 10px;"><strong>Vaga Original de:</strong> ${notificationData.funcionario_saiu}</li>
            <li style="margin-bottom: 10px;"><strong>Data de Abertura:</strong> ${notificationData.data_abertura_vaga}</li>
            <li style="margin-bottom: 10px;"><strong>Dias em Aberto:</strong> ${notificationData.dias_em_aberto} dias</li>
          </ul>
        </div>

        <p>Acesse o sistema para visualizar mais detalhes e iniciar o processo.</p>
        
        <a href="${notificationData.app_url}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Acessar Minhas Vagas
        </a>
        
        <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
          Esta é uma mensagem automática do sistema de Gestão de Vagas.
        </p>
      </div>
    `;

    // Conectar ao Gmail SMTP
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    // Enviar email
    await client.send({
      from: GMAIL_USER,
      to: notificationData.analista_email,
      subject: `Nova Vaga Atribuída: ${notificationData.cargo_saiu}`,
      content: "auto",
      html: htmlContent,
    });

    await client.close();

    console.log("[SUCESSO] Email enviado com sucesso via Gmail!");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[ERRO] Exception na function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
