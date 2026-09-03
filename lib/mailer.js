import nodemailer from "nodemailer";

export function mailer(){
  if(!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) throw new Error("Gmail SMTP is not configured.");
  return nodemailer.createTransport({
    host:"smtp.gmail.com",
    port:465,
    secure:true,
    auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_APP_PASSWORD}
  });
}

export async function sendMail({to,subject,html}){
  const transporter=mailer();
  return transporter.sendMail({
    from:`"VALE BEAUTY VK" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html
  });
}
