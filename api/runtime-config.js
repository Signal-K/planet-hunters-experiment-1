module.exports = (req, res) => {
  const regionRaw = String(process.env.Posthog_Region || process.env.POSTHOG_REGION || "US Cloud").toLowerCase();
  const isEu = regionRaw.includes("eu");
  const posthogUiHost = process.env.Posthog_UI_Host || process.env.POSTHOG_UI_HOST || (isEu ? "https://eu.posthog.com" : "https://us.posthog.com");
  const posthogApiHost =
    process.env.Posthog_API_Host || process.env.POSTHOG_API_HOST || (isEu ? "https://eu.i.posthog.com" : "https://us.i.posthog.com");

  const payload = {
    posthog: {
      projectToken: process.env.Posthog_Project_Token || process.env.POSTHOG_PROJECT_TOKEN || "",
      projectId: process.env.Posthog_Project_ID || process.env.POSTHOG_PROJECT_ID || "",
      region: process.env.Posthog_Region || process.env.POSTHOG_REGION || "",
      apiHost: posthogApiHost,
      uiHost: posthogUiHost,
      surveyId: process.env.Posthog_Survey_ID || process.env.POSTHOG_SURVEY_ID || "019c9df8-db7f-0000-072f-73b3347a4d6c",
    },
    supabase: {
      url: process.env.SUPABASE_URL || "",
      anonKey: process.env.SUPABASE_ANON || process.env.SUPABASE_ANON_KEY || "",
    },
    push: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
    },
  };

  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json(payload);
};
