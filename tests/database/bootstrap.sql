-- Minimal Supabase Auth contract, populated only with synthetic local users.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

create schema test;
grant usage on schema test to authenticated, anon;
create function test.assert(condition boolean, message text) returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'Assertion failed: %', message; end if;
end;
$$;
create function test.assert_raises(statement text, expected text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if position(expected in sqlerrm) > 0 then return; end if;
    raise exception 'Expected error containing "%", received "%"', expected, sqlerrm;
  end;
  raise exception 'Expected error containing "%", but statement succeeded: %', expected, statement;
end;
$$;
