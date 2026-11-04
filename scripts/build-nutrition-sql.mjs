import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const files=["20261104000000_add_nutrition_preferences.sql","20261104010000_add_meals_and_food_logs.sql","20261104020000_add_personalized_meal_plans.sql"];
const sql=files.map(file=>{const source=readFileSync(join(root,"supabase/migrations",file),"utf8").trim();if(!source.startsWith("begin;")||!source.endsWith("commit;"))throw new Error(`Expected transaction boundaries in ${file}`);return `-- SOURCE: ${file}\n${source.slice(6,-7).trim()}`;}).join("\n\n");
const output=`-- Buff Me Up nutrition release, migrations 14–16. Generated; edit the source migrations.\n-- Run ONCE after existing migrations 1–13, only when all three nutrition migrations are pending.\n-- Do not combine this manual SQL path with an existing CLI migration history without reconciling it.\nbegin;\ndo $$ begin\n if to_regclass('public.gym_profiles') is null or to_regclass('public.gym_meals') is not null or to_regclass('public.gym_nutrition_preferences') is not null or to_regclass('public.gym_meal_plans') is not null then\n  raise exception 'Expected existing Buff Me Up foundation and no previously applied nutrition tables. Use only pending individual migrations if partially applied.';\n end if;\nend $$;\n\n${sql}\n\nnotify pgrst, 'reload schema';\ncommit;\n`;
const target=join(root,"supabase/deploy/nutrition_2026_11_04.sql");
if(process.argv.includes("--check")){if(readFileSync(target,"utf8")!==output)throw new Error("Nutrition SQL bundle is stale. Run npm run sql:nutrition.");console.log("PASS: nutrition SQL bundle matches migrations 14–16");}
else{writeFileSync(target,output);console.log("Generated supabase/deploy/nutrition_2026_11_04.sql from migrations 14–16");}
