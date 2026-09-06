alter table public.users
  add column if not exists language_preference text default 'en-GB',
  add column if not exists theme_preference text default 'dark';

alter table public.users
  drop constraint if exists users_language_preference_check,
  add constraint users_language_preference_check
    check (language_preference in ('bn','ar','ur','pk','hi','en-US','en-GB','de','ja','zh','nl','es','fr'));

alter table public.users
  drop constraint if exists users_theme_preference_check,
  add constraint users_theme_preference_check
    check (theme_preference in ('dark','light','system'));

update public.users
set
  language_preference = coalesce(language_preference, 'en-GB'),
  theme_preference = coalesce(theme_preference, 'dark');
