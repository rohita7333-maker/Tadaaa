/** Escape HTML entities to prevent XSS in email templates */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BRAND = {
  bg: "#FFF8F0",
  card: "#FFFFFF",
  text: "#2D2926",
  muted: "#6B5E57",
  accent: "#C4686D",
  accentDark: "#9B3D42",
  border: "#D4CBC3",
  gold: "#C9A96E",
};

function layout(content: string, preheader = "", unsubscribeUrl?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>TaDaaaa</title>
${preheader ? `<!--[if !mso]><!--><span style="display:none;max-height:0;overflow:hidden">${preheader}</span><!--<![endif]-->` : ""}
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg}">
<tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${BRAND.card};border-radius:24px;border:1px solid ${BRAND.border}30;box-shadow:0 4px 24px rgba(45,41,38,0.06)">
<tr><td style="padding:40px 32px">
<!-- Logo -->
<table role="presentation" cellspacing="0" cellpadding="0"><tr>
<td style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,${BRAND.accent},${BRAND.accentDark});text-align:center;vertical-align:middle;color:white;font-size:18px">&#10084;</td>
<td style="padding-left:10px;font-size:20px;font-weight:700;color:${BRAND.text}">TaDaaaa</td>
</tr></table>
<div style="height:28px"></div>
${content}
</td></tr>
</table>
<!-- Footer -->
<p style="margin:24px 0 0;font-size:11px;color:${BRAND.muted};text-align:center">
Made with &#10084; by TaDaaaa &middot; <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://tadaaaa.app"}/settings" style="color:${BRAND.muted}">Manage notifications</a>${unsubscribeUrl ? ` &middot; <a href="${unsubscribeUrl}" style="color:${BRAND.muted}">Unsubscribe</a>` : ""}
</p>
</td></tr>
</table>
</body>
</html>`;
}

function button(text: string, href: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0"><tr>
<td style="border-radius:14px;background:linear-gradient(135deg,${BRAND.accent},${BRAND.accentDark});padding:14px 32px">
<a href="${href}" style="color:white;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">${text}</a>
</td></tr></table>`;
}

export function inviteViewedEmail(creatorName: string, inviteTitle: string, dashboardUrl: string) {
  return {
    subject: `Someone opened "${esc(inviteTitle)}" ✨`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;color:${BRAND.text}">Your surprise was opened!</h1>
      <p style="margin:0 0 4px;font-size:15px;color:${BRAND.muted};line-height:1.6">
        Hey ${esc(creatorName)}, someone just tapped to reveal <strong style="color:${BRAND.text}">"${esc(inviteTitle)}"</strong>.
      </p>
      <p style="margin:0;font-size:15px;color:${BRAND.muted};line-height:1.6">
        Head to your dashboard to see the view count and any responses.
      </p>
      ${button("View Dashboard", dashboardUrl)}
    `, `Someone opened your surprise "${inviteTitle}"`),
  };
}

export function inviteAnsweredEmail(
  creatorName: string,
  inviteTitle: string,
  questionText: string,
  answer: boolean,
  dashboardUrl: string
) {
  const emoji = answer ? "&#127881;" : "&#128172;";
  const answerText = answer ? "Yes" : "No";
  return {
    subject: `New answer on "${esc(inviteTitle)}" — ${answerText} ${answer ? "🎉" : ""}`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;color:${BRAND.text}">Someone answered! ${emoji}</h1>
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND.muted};line-height:1.6">
        Hey ${esc(creatorName)}, you got a response on <strong style="color:${BRAND.text}">"${esc(inviteTitle)}"</strong>:
      </p>
      <div style="background:${BRAND.bg};border-radius:16px;padding:20px;border:1px solid ${BRAND.border}30">
        <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:0.5px">Question</p>
        <p style="margin:0 0 16px;font-size:15px;color:${BRAND.text};font-weight:500">${esc(questionText)}</p>
        <p style="margin:0;font-size:13px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:0.5px">Answer</p>
        <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${answer ? "#5aaa69" : BRAND.accent}">${answerText}</p>
      </div>
      ${button("See All Responses", dashboardUrl)}
    `, `New answer on "${inviteTitle}": ${answerText}`),
  };
}

export function monthlyReengagementEmail(
  userName: string,
  stats: { totalInvites: number; totalViews: number; totalAnswers: number },
  createUrl: string,
  unsubscribeUrl: string
) {
  const month = new Date().toLocaleDateString("en-US", { month: "long" });
  return {
    subject: `Your ${month} TaDaaaa recap ✨`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;color:${BRAND.text}">Your ${month} recap</h1>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.muted};line-height:1.6">
        Hey ${esc(userName)}, here's how your surprises are doing:
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="background:${BRAND.bg};border-radius:16px;padding:20px;width:33%">
            <p style="margin:0;font-size:28px;font-weight:800;color:${BRAND.accent}">${stats.totalInvites}</p>
            <p style="margin:4px 0 0;font-size:12px;color:${BRAND.muted}">Surprises</p>
          </td>
          <td width="8"></td>
          <td align="center" style="background:${BRAND.bg};border-radius:16px;padding:20px;width:33%">
            <p style="margin:0;font-size:28px;font-weight:800;color:${BRAND.gold}">${stats.totalViews}</p>
            <p style="margin:4px 0 0;font-size:12px;color:${BRAND.muted}">Views</p>
          </td>
          <td width="8"></td>
          <td align="center" style="background:${BRAND.bg};border-radius:16px;padding:20px;width:33%">
            <p style="margin:0;font-size:28px;font-weight:800;color:#5aaa69">${stats.totalAnswers}</p>
            <p style="margin:4px 0 0;font-size:12px;color:${BRAND.muted}">Answers</p>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;font-size:15px;color:${BRAND.muted};line-height:1.6">
        Got a birthday, anniversary, or special moment coming up? Start a new surprise!
      </p>
      ${button("Create a Surprise", createUrl)}
    `, `Your ${month} TaDaaaa recap — ${stats.totalViews} views this month`, unsubscribeUrl),
  };
}

export function welcomeEmail(userName: string, createUrl: string) {
  return {
    subject: "Welcome to TaDaaaa! 🎉",
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;color:${BRAND.text}">Welcome, ${esc(userName)}!</h1>
      <p style="margin:0 0 4px;font-size:15px;color:${BRAND.muted};line-height:1.6">
        You're all set to start creating magical surprises for the people you love.
      </p>
      <p style="margin:0;font-size:15px;color:${BRAND.muted};line-height:1.6">
        Upload photos, write a heartfelt message, choose a reveal style, and share the link. It takes under 3 minutes.
      </p>
      ${button("Create Your First Surprise", createUrl)}
      <p style="margin:0;font-size:13px;color:${BRAND.muted}">
        Need inspiration? Check out our <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://tadaaaa.app"}/about" style="color:${BRAND.accent};font-weight:600">About page</a> to see how it works.
      </p>
    `, "Welcome to TaDaaaa — create your first surprise!"),
  };
}
