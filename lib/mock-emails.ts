import type { Email, ConnectedAccount } from "./types";

/** Mock connected accounts — one Gmail, one Office 365 */
export const MOCK_ACCOUNTS: ConnectedAccount[] = [
  {
    id: "acc_gmail_1",
    userId: "user_1",
    provider: "gmail",
    email: "alex.morgan@gmail.com",
    displayName: "Alex Morgan (Gmail)",
    color: "#EA4335",
    isActive: true,
  },
  {
    id: "acc_o365_1",
    userId: "user_1",
    provider: "office365",
    email: "alex.morgan@contoso.com",
    displayName: "Alex Morgan (Work)",
    color: "#0078D4",
    isActive: true,
  },
];

/** Helper: produce a Date N days ago from 2026-05-19 */
function daysAgo(n: number, hours = 9, minutes = 0): Date {
  const d = new Date("2026-05-19T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

export const MOCK_EMAILS: Email[] = [
  // --- 1 ---
  {
    id: "email_001",
    threadId: "thread_001",
    accountId: "acc_gmail_1",
    from: { name: "Sarah Chen", address: "sarah.chen@acmecorp.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@gmail.com" }],
    subject: "Q2 Product Roadmap — please review before Thursday",
    preview:
      "Hi Alex, attaching the updated Q2 roadmap. Could you give it a look before the all-hands on Thursday?",
    body: `<p>Hi Alex,</p>
<p>Please find the updated Q2 product roadmap attached. The main changes from last quarter are:</p>
<ul>
  <li>Moved the AI-search feature to May (was June)</li>
  <li>Pushed the mobile redesign to Q3 based on eng capacity</li>
  <li>Added a new "Smart Triage" epic that marketing is very excited about</li>
</ul>
<p>Could you give it a thorough review before Thursday's all-hands? I'd love your input on the prioritisation of the triage epic especially.</p>
<p>Thanks,<br/>Sarah</p>`,
    date: daysAgo(0, 8, 42),
    isRead: false,
    isStarred: true,
    labels: ["inbox", "work"],
    hasAttachments: true,
    aiPriority: "high",
    aiSummary:
      "Sarah wants you to review the updated Q2 roadmap before Thursday's all-hands. Key changes: AI-search moved to May, mobile redesign pushed to Q3, new Smart Triage epic added.",
    isDraft: false,
  },

  // --- 2 ---
  {
    id: "email_002",
    threadId: "thread_002",
    accountId: "acc_o365_1",
    from: { name: "Liam Patel", address: "l.patel@contoso.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@contoso.com" }],
    cc: [{ name: "Priya Nair", address: "p.nair@contoso.com" }],
    subject: "Action required: approve headcount request by EOD",
    preview:
      "Alex, the HC request for two senior engineers needs your approval in Workday before end of day today.",
    body: `<p>Hi Alex,</p>
<p>As discussed in the leadership sync, we have a headcount request for <strong>two senior software engineers</strong> that requires your approval in Workday.</p>
<p>The requisitions are:</p>
<ul>
  <li>REQ-4521 — Senior SWE, Platform (L5)</li>
  <li>REQ-4522 — Senior SWE, AI/ML (L5)</li>
</ul>
<p>Could you please approve both in Workday by EOD today? Finance closes the HC window at midnight.</p>
<p>Let me know if you have any questions.<br/>Liam</p>`,
    date: daysAgo(0, 7, 15),
    isRead: false,
    isStarred: false,
    labels: ["inbox", "work"],
    hasAttachments: false,
    aiPriority: "high",
    aiSummary:
      "Liam needs you to approve two L5 SWE headcount requests in Workday (REQ-4521 and REQ-4522) before end of today.",
    isDraft: false,
  },

  // --- 3 ---
  {
    id: "email_003",
    threadId: "thread_003",
    accountId: "acc_gmail_1",
    from: { name: "GitHub", address: "noreply@github.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@gmail.com" }],
    subject: "[aire-app/aire] PR #214: feat: AI triage scoring engine",
    preview:
      "danielwu opened a pull request: feat: AI triage scoring engine — adds priority scoring via Claude API.",
    body: `<p><strong>danielwu</strong> opened pull request <a href="#">#214</a> in <strong>aire-app/aire</strong></p>
<h3>feat: AI triage scoring engine</h3>
<p>Implements the email priority scoring pipeline using the Claude API. Adds:</p>
<ul>
  <li>Batch scoring job that runs on new message sync</li>
  <li>Priority enum stored in <code>cached_emails.ai_priority</code></li>
  <li>Unit tests with mocked Claude responses</li>
</ul>
<p><a href="#">View pull request</a></p>`,
    date: daysAgo(1, 14, 5),
    isRead: true,
    isStarred: false,
    labels: ["inbox"],
    hasAttachments: false,
    aiPriority: "normal",
    aiSummary: null,
    isDraft: false,
  },

  // --- 4 ---
  {
    id: "email_004",
    threadId: "thread_004",
    accountId: "acc_gmail_1",
    from: { name: "Mia Johansson", address: "mia.j@designstudio.io" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@gmail.com" }],
    subject: "Final brand assets for Aire — download link inside",
    preview:
      "Hey! The final logo files, icon set, and colour palette are ready. Download link valid for 7 days.",
    body: `<p>Hey Alex!</p>
<p>The final brand assets are ready. You can download everything from the link below (valid for 7 days):</p>
<p><a href="#">https://designstudio.io/share/aire-brand-v3-final</a></p>
<p>Included in the package:</p>
<ul>
  <li>Logo variants (SVG, PNG @1x/2x/3x, dark + light)</li>
  <li>App icon set (all required PWA sizes)</li>
  <li>Colour palette Figma file</li>
  <li>Typography spec sheet</li>
</ul>
<p>Let me know if anything needs tweaking. Loved working on this one!</p>
<p>Mia ✨</p>`,
    date: daysAgo(1, 11, 30),
    isRead: false,
    isStarred: true,
    labels: ["inbox", "personal"],
    hasAttachments: false,
    aiPriority: "normal",
    aiSummary:
      "Mia sent the final Aire brand assets (logos, icons, colour palette, typography). Download link expires in 7 days.",
    isDraft: false,
  },

  // --- 5 ---
  {
    id: "email_005",
    threadId: "thread_005",
    accountId: "acc_o365_1",
    from: { name: "Jira", address: "jira@contoso.atlassian.net" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@contoso.com" }],
    subject: "[AIRE-812] Bug: email body missing after sync — assigned to you",
    preview:
      "AIRE-812 has been assigned to you. Bug: email body content is empty for some IMAP accounts after delta sync.",
    body: `<p>Issue <strong>AIRE-812</strong> has been assigned to you.</p>
<p><strong>Summary:</strong> Email body content is empty for some IMAP accounts after delta sync</p>
<p><strong>Priority:</strong> High</p>
<p><strong>Reporter:</strong> QA Team</p>
<p><strong>Description:</strong><br/>
After the delta sync introduced in v0.14, approximately 8% of emails fetched from IMAP accounts have an empty body. The preview text is correct but <code>bodyHtml</code> is null in the DB. Affects accounts using IMAP with CONDSTORE.</p>
<p><a href="#">View issue in Jira</a></p>`,
    date: daysAgo(2, 9, 0),
    isRead: true,
    isStarred: false,
    labels: ["inbox", "work"],
    hasAttachments: false,
    aiPriority: "high",
    aiSummary:
      "AIRE-812 assigned to you: ~8% of IMAP emails have empty body after delta sync. Affects CONDSTORE accounts. High priority.",
    isDraft: false,
  },

  // --- 6 ---
  {
    id: "email_006",
    threadId: "thread_006",
    accountId: "acc_gmail_1",
    from: { name: "Stripe", address: "receipts@stripe.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@gmail.com" }],
    subject: "Your receipt from Anthropic — $20.00",
    preview:
      "Thanks for your payment of $20.00 to Anthropic. Your invoice is attached.",
    body: `<p>Thanks for your payment.</p>
<table>
  <tr><td>Amount paid</td><td><strong>$20.00</strong></td></tr>
  <tr><td>Date</td><td>May 17, 2026</td></tr>
  <tr><td>Payment method</td><td>Visa ending in 4242</td></tr>
  <tr><td>Invoice number</td><td>INV-2026-05-4421</td></tr>
</table>
<p>A PDF of your invoice is attached to this email.</p>
<p>— Stripe</p>`,
    date: daysAgo(2, 16, 22),
    isRead: true,
    isStarred: false,
    labels: ["inbox"],
    hasAttachments: true,
    aiPriority: "low",
    aiSummary: null,
    isDraft: false,
  },

  // --- 7 ---
  {
    id: "email_007",
    threadId: "thread_007",
    accountId: "acc_o365_1",
    from: { name: "Elena Vasquez", address: "e.vasquez@contoso.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@contoso.com" }],
    subject: "Re: OKR check-in — Q2 mid-point",
    preview:
      "Thanks for sharing the progress, Alex. The AI triage metric looks great. One question on the retention OKR…",
    body: `<p>Thanks for sharing the progress update, Alex.</p>
<p>The AI triage satisfaction metric is looking great — 78% is well above the 65% target. Nice work from the team.</p>
<p>I do have one question about the retention OKR. The current 3-month retention is sitting at 41% vs a target of 50%. What's the plan to close the gap in the remaining 6 weeks?</p>
<p>Happy to jump on a call this week if helpful.</p>
<p>Elena</p>`,
    date: daysAgo(3, 10, 45),
    isRead: true,
    isStarred: false,
    labels: ["inbox", "work"],
    hasAttachments: false,
    aiPriority: "normal",
    aiSummary:
      "Elena is happy with the AI triage numbers (78% vs 65% target) but is asking about the plan to close the retention gap (41% vs 50% target).",
    isDraft: false,
  },

  // --- 8 ---
  {
    id: "email_008",
    threadId: "thread_008",
    accountId: "acc_gmail_1",
    from: { name: "Newsletter: TLDR Tech", address: "dan@tldrnewsletter.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@gmail.com" }],
    subject: "TLDR 2026-05-16: OpenAI launches o5, Apple acquires AI startup",
    preview:
      "Today: OpenAI's o5 model scores record MMLU, Apple quietly acquires Paris-based vision AI startup Lumena, and more.",
    body: `<h2>TLDR — Tech News for Busy People</h2>
<p><strong>May 16, 2026</strong></p>
<hr/>
<h3>Big Tech & Startups</h3>
<p><strong>OpenAI launches o5 reasoning model</strong> — scores 97.3% on MMLU, sets new benchmark records across math and coding tasks.</p>
<p><strong>Apple acquires Lumena</strong> — the Paris-based computer vision AI startup joins Apple's Vision Products group.</p>
<h3>Dev & Open Source</h3>
<p><strong>Rust 2.0 alpha released</strong> — edition 2027 proposal includes async traits stabilised and new borrow checker improvements.</p>
<hr/>
<p><a href="#">Unsubscribe</a> | <a href="#">View online</a></p>`,
    date: daysAgo(3, 6, 0),
    isRead: true,
    isStarred: false,
    labels: ["inbox"],
    hasAttachments: false,
    aiPriority: "low",
    aiSummary: null,
    isDraft: false,
  },

  // --- 9 ---
  {
    id: "email_009",
    threadId: "thread_009",
    accountId: "acc_o365_1",
    from: { name: "Omar Hassan", address: "o.hassan@contoso.com" },
    to: [
      { name: "Alex Morgan", address: "alex.morgan@contoso.com" },
      { name: "Sarah Chen", address: "sarah.chen@acmecorp.com" },
    ],
    subject: "Security review findings — Aire v0.14",
    preview:
      "Hi team, attaching the security review report for v0.14. Two medium findings need addressing before GA.",
    body: `<p>Hi team,</p>
<p>Please find attached the security review report for Aire v0.14. Overall the posture is good — no critical findings.</p>
<p><strong>Medium findings (must fix before GA):</strong></p>
<ol>
  <li><strong>M-01:</strong> OAuth refresh tokens stored in localStorage on the web client. Should move to httpOnly cookies.</li>
  <li><strong>M-02:</strong> Email body encryption key derivation uses PBKDF2 with only 10,000 iterations. Recommend upgrading to 310,000 (NIST 2023 recommendation).</li>
</ol>
<p><strong>Low findings (fix in next cycle):</strong> 3 items — see report.</p>
<p>Happy to walk through the findings on a call. Let me know your availability.</p>
<p>Omar</p>`,
    date: daysAgo(4, 15, 10),
    isRead: false,
    isStarred: true,
    labels: ["inbox", "work"],
    hasAttachments: true,
    aiPriority: "high",
    aiSummary:
      "Security review found 2 medium issues before GA: OAuth tokens in localStorage (should use httpOnly cookies) and weak PBKDF2 iteration count. No critical findings.",
    isDraft: false,
  },

  // --- 10 ---
  {
    id: "email_010",
    threadId: "thread_010",
    accountId: "acc_gmail_1",
    from: { name: "Airbnb", address: "automated@airbnb.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@gmail.com" }],
    subject: "Your trip to Lisbon is confirmed! 🏡",
    preview:
      "You're all set for Lisbon, Jun 14–21. Check-in instructions and your host's contact details are inside.",
    body: `<p>Great news — your booking is confirmed!</p>
<table>
  <tr><td>Destination</td><td>Lisbon, Portugal</td></tr>
  <tr><td>Dates</td><td>Jun 14 – Jun 21, 2026 (7 nights)</td></tr>
  <tr><td>Property</td><td>Cosy Alfama apartment with terrace</td></tr>
  <tr><td>Host</td><td>Ana S.</td></tr>
  <tr><td>Total charged</td><td>€843.00</td></tr>
</table>
<p>Check-in time is 3 PM. Ana will send you the key-box code 24 hours before arrival.</p>
<p><a href="#">View reservation</a></p>`,
    date: daysAgo(5, 18, 33),
    isRead: true,
    isStarred: true,
    labels: ["inbox", "personal"],
    hasAttachments: false,
    aiPriority: "normal",
    aiSummary:
      "Airbnb booking confirmed: Lisbon, Jun 14–21, Alfama apartment, €843. Check-in 3 PM; key-box code sent 24h before.",
    isDraft: false,
  },

  // --- 11 ---
  {
    id: "email_011",
    threadId: "thread_011",
    accountId: "acc_o365_1",
    from: { name: "Nadia Okonkwo", address: "n.okonkwo@contoso.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@contoso.com" }],
    subject: "Investor update deck — draft for your review",
    preview:
      "Alex, I've prepared a first draft of the Series B investor update. Please review slides 8–14 (financials) especially.",
    body: `<p>Hi Alex,</p>
<p>I've finished the first draft of the Series B investor update deck. You'll find it in the shared Drive folder.</p>
<p>I'd particularly appreciate your eye on slides 8–14 (financials) and slide 22 (product roadmap). The rest is largely boilerplate from last quarter.</p>
<p>We need to send to investors by Friday COB, so if you could share feedback by Thursday noon that would be ideal.</p>
<p>Thanks,<br/>Nadia</p>`,
    date: daysAgo(6, 9, 20),
    isRead: false,
    isStarred: false,
    labels: ["inbox", "work"],
    hasAttachments: false,
    aiPriority: "high",
    aiSummary:
      "Nadia needs feedback on Series B investor update deck by Thursday noon — focus on slides 8–14 (financials) and slide 22 (roadmap). Sends to investors Friday COB.",
    isDraft: false,
  },

  // --- 12 ---
  {
    id: "email_012",
    threadId: "thread_012",
    accountId: "acc_gmail_1",
    from: { name: "Dev.to", address: "noreply@dev.to" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@gmail.com" }],
    subject: "Your post 'Building a PWA with Next.js 14' is trending 🔥",
    preview:
      "Great news! Your post has been read 12,400 times in the last 24 hours and is the #2 trending article on Dev.to.",
    body: `<p>Your post <strong>"Building a PWA with Next.js 14"</strong> is trending on Dev.to!</p>
<ul>
  <li>24-hour reads: <strong>12,400</strong></li>
  <li>Reactions: <strong>847</strong></li>
  <li>Trending position: <strong>#2</strong></li>
  <li>New followers: <strong>213</strong></li>
</ul>
<p><a href="#">View your post</a></p>`,
    date: daysAgo(7, 13, 0),
    isRead: true,
    isStarred: false,
    labels: ["inbox"],
    hasAttachments: false,
    aiPriority: "low",
    aiSummary: null,
    isDraft: false,
  },

  // --- 13 ---
  {
    id: "email_013",
    threadId: "thread_013",
    accountId: "acc_o365_1",
    from: { name: "IT Help Desk", address: "helpdesk@contoso.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@contoso.com" }],
    subject: "Your password expires in 7 days — action required",
    preview:
      "Your Contoso network password will expire on May 26. Please change it before then to avoid being locked out.",
    body: `<p>Hi Alex,</p>
<p>This is a reminder that your Contoso network password will expire in <strong>7 days</strong> (May 26, 2026).</p>
<p>Please visit the <a href="#">Self-Service Password Portal</a> to update your password before then.</p>
<p>If you need assistance, contact the IT Help Desk at ext. 4357 or <a href="mailto:helpdesk@contoso.com">helpdesk@contoso.com</a>.</p>
<p>— IT Help Desk</p>`,
    date: daysAgo(7, 8, 0),
    isRead: false,
    isStarred: false,
    labels: ["inbox"],
    hasAttachments: false,
    aiPriority: "normal",
    aiSummary: "Your work password expires May 26 — update via Self-Service Password Portal.",
    isDraft: false,
  },

  // --- 14 ---
  {
    id: "email_014",
    threadId: "thread_014",
    accountId: "acc_gmail_1",
    from: { name: "Jake Rivera", address: "jake@openai.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@gmail.com" }],
    subject: "Intro: Alex <> OpenAI Partnerships",
    preview:
      "Hi Alex, Jake here from OpenAI partnerships. Loved the Aire demo — would love to explore an integration partnership.",
    body: `<p>Hi Alex,</p>
<p>I'm Jake, Head of Developer Partnerships at OpenAI. I came across the Aire demo at last week's developer event and was genuinely impressed.</p>
<p>I'd love to explore whether there's a natural partnership angle — particularly around integrating OpenAI models as an option alongside your existing AI layer.</p>
<p>Would you be open to a 30-minute call next week? I'm flexible on timing.</p>
<p>Looking forward to connecting,<br/>Jake Rivera<br/>Head of Developer Partnerships, OpenAI</p>`,
    date: daysAgo(9, 17, 55),
    isRead: false,
    isStarred: true,
    labels: ["inbox", "personal"],
    hasAttachments: false,
    aiPriority: "high",
    aiSummary:
      "Jake from OpenAI partnerships wants a 30-min call to explore an integration partnership with Aire. Flexible on timing next week.",
    isDraft: false,
  },

  // --- 15 ---
  {
    id: "email_015",
    threadId: "thread_015",
    accountId: "acc_o365_1",
    from: { name: "Alex Morgan", address: "alex.morgan@contoso.com" },
    to: [{ name: "Engineering Team", address: "engineering@contoso.com" }],
    subject: "Re: Sprint 22 retrospective notes",
    preview:
      "Thanks everyone for a great retro. Action items captured below. Will track in Jira.",
    body: `<p>Hi team,</p>
<p>Thanks everyone for a great Sprint 22 retro. Here's the summary:</p>
<h3>What went well</h3>
<ul>
  <li>AI triage feature shipped on time</li>
  <li>Zero P0 incidents this sprint</li>
</ul>
<h3>What to improve</h3>
<ul>
  <li>PR review turnaround still slow (avg 2.3 days)</li>
  <li>Test coverage dropped to 71% — need to address</li>
</ul>
<h3>Action items</h3>
<ul>
  <li>Set 24h PR review SLA (owner: Alex, due: May 20)</li>
  <li>Coverage gate at 75% added to CI (owner: Daniel, due: May 22)</li>
</ul>
<p>Alex</p>`,
    date: daysAgo(10, 11, 0),
    isRead: true,
    isStarred: false,
    labels: ["sent", "work"],
    hasAttachments: false,
    aiPriority: "normal",
    aiSummary: null,
    isDraft: false,
  },

  // --- 16 ---
  {
    id: "email_016",
    threadId: "thread_016",
    accountId: "acc_gmail_1",
    from: { name: "Figma", address: "no-reply@figma.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@gmail.com" }],
    subject: "Mia Johansson shared 'Aire Design System v2' with you",
    preview:
      "Mia Johansson has shared a Figma file with you: Aire Design System v2.",
    body: `<p><strong>Mia Johansson</strong> has shared a file with you.</p>
<p><strong>Aire Design System v2</strong></p>
<p>
  <a href="#">Open in Figma</a>
</p>
<p>You have been given <strong>can edit</strong> access.</p>`,
    date: daysAgo(11, 14, 20),
    isRead: true,
    isStarred: false,
    labels: ["inbox"],
    hasAttachments: false,
    aiPriority: "low",
    aiSummary: null,
    isDraft: false,
  },

  // --- 17 ---
  {
    id: "email_017",
    threadId: "thread_017",
    accountId: "acc_o365_1",
    from: { name: "Legal — Contoso", address: "legal@contoso.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@contoso.com" }],
    subject: "Updated employment agreement — signature required by May 25",
    preview:
      "Please review and sign the updated employment agreement via DocuSign by May 25, 2026.",
    body: `<p>Dear Alex,</p>
<p>Please find enclosed your updated employment agreement reflecting the changes discussed in the compensation review.</p>
<p>Key changes:</p>
<ul>
  <li>Updated base compensation effective June 1, 2026</li>
  <li>Revised equity vesting schedule (4-year cliff → 1-year cliff + monthly)</li>
  <li>Updated remote work policy clause</li>
</ul>
<p>Please sign via DocuSign using the link below by <strong>May 25, 2026</strong>.</p>
<p><a href="#">Sign document in DocuSign</a></p>
<p>Contact legal@contoso.com with any questions.</p>`,
    date: daysAgo(12, 10, 5),
    isRead: false,
    isStarred: false,
    labels: ["inbox", "work"],
    hasAttachments: true,
    aiPriority: "high",
    aiSummary:
      "Employment agreement updated (new comp, 1-year equity cliff, remote work clause). Sign via DocuSign by May 25.",
    isDraft: false,
  },

  // --- 18 ---
  {
    id: "email_018",
    threadId: "thread_018",
    accountId: "acc_gmail_1",
    from: { name: "Mom", address: "carol.morgan@gmail.com" },
    to: [{ name: "Alex Morgan", address: "alex.morgan@gmail.com" }],
    subject: "Dad's birthday dinner — are you free June 7?",
    preview:
      "Hi sweetheart, just checking if you're free for Dad's 65th birthday dinner on June 7. We're thinking the Italian place in town.",
    body: `<p>Hi sweetheart,</p>
<p>Dad's 65th birthday is coming up on June 7 and we'd love for you to join us for a family dinner. We're thinking of booking Ristorante Bella Vista in town — Dad's favourite.</p>
<p>Are you free that Saturday evening? Let me know so I can make a reservation for everyone.</p>
<p>Also, if you have any gift ideas please send them along. He's impossible to shop for as always 😂</p>
<p>Love you lots,<br/>Mom xx</p>`,
    date: daysAgo(14, 19, 10),
    isRead: true,
    isStarred: false,
    labels: ["inbox", "personal"],
    hasAttachments: false,
    aiPriority: "normal",
    aiSummary: "Mom asking if you're free June 7 for Dad's 65th birthday dinner at Ristorante Bella Vista.",
    isDraft: false,
  },

  // --- 19 ---
  {
    id: "email_019",
    threadId: "thread_019",
    accountId: "acc_o365_1",
    from: { name: "Alex Morgan", address: "alex.morgan@contoso.com" },
    to: [{ name: "Jake Rivera", address: "jake@openai.com" }],
    subject: "Re: Intro: Alex <> OpenAI Partnerships",
    preview:
      "Hi Jake, thanks for reaching out! I'd love to connect. How does Tuesday at 3pm PT work for you?",
    body: `<p>Hi Jake,</p>
<p>Thanks for reaching out — really glad the demo resonated. I'd love to explore what a partnership could look like.</p>
<p>How does <strong>Tuesday, May 26 at 3pm PT</strong> work for a call? If not, I'm also free Wednesday afternoon.</p>
<p>Looking forward to it,<br/>Alex</p>`,
    date: daysAgo(8, 12, 0),
    isRead: true,
    isStarred: false,
    labels: ["sent"],
    hasAttachments: false,
    aiPriority: "normal",
    aiSummary: null,
    isDraft: false,
  },

  // --- 20 ---
  {
    id: "email_020",
    threadId: "thread_020",
    accountId: "acc_gmail_1",
    from: { name: "Alex Morgan", address: "alex.morgan@gmail.com" },
    to: [{ name: "Mia Johansson", address: "mia.j@designstudio.io" }],
    subject: "Brand assets — a few small tweaks",
    preview:
      "Hi Mia, love the final files! Just three small requests before we lock things down…",
    body: `<p>Hi Mia,</p>
<p>Love the final assets — the icon set in particular is spot on.</p>
<p>Just three small tweaks before we lock everything down:</p>
<ol>
  <li>The dark-mode logo — could you nudge the indigo down one shade (6366F1 → 4F46E5)? Slightly better contrast on the dark background.</li>
  <li>We'll also need a monochrome version of the icon for platform contexts that don't support colour.</li>
  <li>Can you export a 1024×1024 version for the App Store listing?</li>
</ol>
<p>No rush — by end of week is fine!</p>
<p>Alex</p>`,
    date: daysAgo(0, 10, 15),
    isRead: true,
    isStarred: false,
    labels: ["sent"],
    hasAttachments: false,
    aiPriority: "normal",
    aiSummary: null,
    isDraft: false,
  },
];

/**
 * Returns a filtered list of mock emails.
 * @param accountId - Optional account ID filter. Omit or pass undefined for all accounts.
 * @param label - Optional label filter. Omit or pass undefined for all labels.
 */
export function getMockEmails(accountId?: string, label?: string): Email[] {
  let results = MOCK_EMAILS;

  if (accountId !== undefined && accountId !== "unified") {
    results = results.filter((e) => e.accountId === accountId);
  }

  if (label !== undefined) {
    results = results.filter((e) => e.labels.includes(label));
  }

  return results;
}
