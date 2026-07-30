import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. LEER DATOS DEL FRONTEND (Esta es la línea que faltaba)
    const data = await request.json();
    const { name, email, message, turnstileToken } = data;

    // 2. Validación básica
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Todos los campos son obligatorios' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Leer variables de entorno
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromName = process.env.SMTP_FROM_NAME || 'Se2Code Contact';
    const contactEmail = process.env.CONTACT_EMAIL || 'se2@se2code.engineer';
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

    // 4. Validar Turnstile (si la clave está configurada)
    if (turnstileSecret && turnstileSecret !== 'TU_SECRET_KEY_AQUI') {
      const turnstileValidation = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: turnstileSecret,
          response: turnstileToken
        })
      });
      
      const turnstileResult = await turnstileValidation.json();
      if (!turnstileResult.success) {
        console.error('❌ Turnstile falló:', turnstileResult);
        return new Response(JSON.stringify({ error: 'Verificación de seguridad fallida.' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 5. Guardar en Directus
    const directusUrl = 'http://172.26.3.43:8055'; 
    const collectionName = 'contact_messages'; 

    const directusResponse = await fetch(`${directusUrl}/items/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        nombre: name,
        email: email, 
        message: message 
      })
    });

    if (!directusResponse.ok) {
      const errorData = await directusResponse.json();
      console.error('❌ Error de Directus:', errorData);
      return new Response(JSON.stringify({ error: 'Error al guardar en la base de datos' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. Limpiar el mensaje para evitar inyección HTML o rotura de strings
    const safeMessage = message
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 7. Enviar correo con Nodemailer
    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="dark">
        <meta name="supported-color-schemes" content="dark">
        <title>Nuevo Mensaje de Contacto</title>
        <style>
          body { background-color: #0a0a0a !important; }
          .dark-bg { background-color: #1a1a1f !important; }
          .darker-bg { background-color: #0f0f12 !important; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0a !important; -webkit-font-smoothing: antialiased; font-family: 'Courier New', Courier, monospace; color: #e4e4e7;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a !important; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #1a1a1f !important; border: 2px solid #00ff88; border-radius: 8px; overflow: hidden; max-width: 100%;">
                <tr>
                  <td style="background-color: #111114 !important; padding: 15px 20px; border-bottom: 3px solid #00ff88;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 12px; height: 12px; background-color: #ff5f56; border-radius: 50%; display: inline-block; margin-right: 6px;"></td>
                        <td style="width: 12px; height: 12px; background-color: #ffbd2e; border-radius: 50%; display: inline-block; margin-right: 6px;"></td>
                        <td style="width: 12px; height: 12px; background-color: #27c93f; border-radius: 50%; display: inline-block;"></td>
                        <td align="right" style="color: #00ff88; font-size: 13px; font-weight: bold; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                          &gt; incoming_transmission.log
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 35px; background-color: #1a1a1f !important;">
                    <h2 style="color: #00ff88 !important; margin: 0 0 30px 0; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; border-bottom: 2px dashed #27272a; padding-bottom: 20px; font-family: 'Courier New', monospace;">
                       Nueva Solicitud de Contacto
                    </h2>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f0f12 !important; border: 1px solid #00ff88; border-radius: 6px; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 25px;">
                          <p style="margin: 0 0 15px 0; color: #00ff88 !important; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">// IDENTIFICACIÓN DEL REMITENTE</p>
                          <p style="margin: 0 0 10px 0; font-size: 16px; font-family: 'Courier New', monospace;">
                            <span style="color: #61dafb !important; font-weight: bold;">Nombre:</span> 
                            <span style="color: #e4e4e7 !important; font-weight: 600;">${name}</span>
                          </p>
                          <p style="margin: 0; font-size: 16px; font-family: 'Courier New', monospace;">
                            <span style="color: #61dafb !important; font-weight: bold;">Email:</span> 
                            <a href="mailto:${email}" style="color: #00ff88 !important; text-decoration: underline; font-weight: 600;">${email}</a>
                          </p>
                        </td>
                        <td width="50" style="background: linear-gradient(180deg, #00ff88 0%, #00cc6a 100%);"></td>
                      </tr>
                    </table>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f0f12 !important; border: 1px solid #27272a; border-radius: 6px;">
                      <tr>
                        <td style="padding: 25px;">
                          <p style="margin: 0 0 15px 0; color: #00ff88 !important; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">// PAYLOAD_DEL_MENSAJE</p>
                          <p style="margin: 0; font-size: 14px; line-height: 1.8; color: #a1a1aa !important; white-space: pre-wrap; font-family: 'Courier New', Courier, monospace; background: #111114 !important; padding: 20px; border-left: 4px solid #00ff88; border-radius: 4px;">
                            ${safeMessage}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #0a0a0a !important; padding: 25px; text-align: center; border-top: 2px solid #00ff88;">
                    <p style="margin: 0 0 8px 0; color: #666 !important; font-size: 11px; font-family: 'Courier New', Courier, monospace; letter-spacing: 1px;">
                      [SYSTEM] Transmission received at ${new Date().toLocaleString('es-ES')}
                    </p>
                    <p style="margin: 0; color: #00ff88 !important; font-size: 13px; font-weight: bold; font-family: 'Courier New', Courier, monospace; letter-spacing: 2px;">
                      Se2Code Engineer | Infrastructure & Software
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;

      try {
        await transporter.sendMail({
          from: `"${fromName}" <${smtpUser}>`,
          to: contactEmail,
          subject: `⚡ [Se2Code] Nuevo mensaje de ${name}`,
          html: emailHtml
        });
        console.log('✅ Email enviado correctamente con diseño DevOps');
      } catch (emailError) {
        console.error('⚠️ Error de SMTP al enviar:', emailError);
      }
    } else {
      console.warn('⚠️ Faltan variables SMTP. Revisa el DEBUG PROCESS ENV arriba.');
    }

    // 8. Respuesta exitosa al frontend
    return new Response(JSON.stringify({ 
      success: true, 
      message: '¡Mensaje enviado con éxito! Te contactaremos pronto.' 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error general en API:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
