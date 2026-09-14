# Shared public content

`src/seed.ts` is the canonical public portfolio content. It is validated by the strict schemas in `src/schema.ts` when imported, used by the web application's content fallback, and written by the API's idempotent seed command. After editing it, rebuild the shared package and run the root seed command to update MongoDB.

The CV and Karna's accompanying instructions are the factual sources. Project descriptions have not been independently verified against the repositories. The hackathon result and Odoo event/location come from Karna's instructions. Unestablished Odoo participation details remain `null`.

The schema contains no academic grades or fields for them. Do not add them to public content, metadata, APIs, or assets. The original CV is not part of this repository and must not be copied into public assets without approval.

## Adding approved assets

All optional files default to `null`. Layout components read the same asset object shape:

```ts
{
  path: "/images/certificates/code-icon.jpg",
  alt: "Karna Bhosle's KJ Somaiya Code Icon Hackathon certificate",
  width: 1600,
  height: 1200,
}
```

The values above illustrate the schema; use the actual uploaded file's dimensions and an accurate description. Paths begin at the web application's public directory. The schema accepts local paths only and rejects directory traversal. Keep certificate text legible in the source file.

1. Place project screenshots in `apps/web/public/images/projects/` and update the matching project's `screenshot` field.
2. Place certificate images in `apps/web/public/images/certificates/`. Update `activities.achievements` entry `code-icon` or `odoo-finale` through its `certificate` field. Verify any additional result, date, or designation against the supplied evidence before populating those fields.
3. Keep `profile.publicResume` unset until Karna supplies a grade-free or explicitly approved public version. Then place it in `apps/web/public/resume/` and set its asset reference. The shared asset object uses the PDF's first-page dimensions and descriptive alt text.
4. Rebuild shared content and run the seed command. No layout changes are needed.

Only approved real screenshots belong in the screenshot fields. The default abstract project illustrations are conceptual previews, not evidence of running project interfaces.

## Contact validation

`contactSchema` rejects unknown properties and validates `name`, `email`, `subject`, `message`, and the optional `website` honeypot. `ContactFields` describes unparsed form input; `ContactInput` describes the validated output with a default empty honeypot. The API remains responsible for rate limits, honeypot rejection, persistence, and email-notification status.
