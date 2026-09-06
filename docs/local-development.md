# Local development

Requirements: Node 22, pnpm 9, Supabase/Postgres, and PlatformIO for firmware. Never use a production database for automated tests.

The rebuild consolidates web and admin into `apps/platform`. Local customer URL is `http://localhost:3000`; admin is `/admin`. Environment variables belong in the platform `.env.local`, not in source control.

Installation and database commands are filled in as implementation lands. Existing local environment files and uncommitted source edits are preserved during restructuring. Legacy database credentials are not automatically used to reset any database.
