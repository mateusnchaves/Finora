-- "Pets" and "pets" are the same category: make the name unique per user and kind, ignoring case.

alter table public.categories drop constraint categories_user_id_kind_name_key;
create unique index categories_user_kind_name_ci_idx on public.categories (user_id, kind, lower(name));
