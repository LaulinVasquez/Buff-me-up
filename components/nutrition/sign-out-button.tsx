"use client";
import { clearNutritionSession } from "./draft-session";
export function SignOutButton({className}:{className:string}){return <button className={className} type="submit" onClick={clearNutritionSession}>Sign out</button>;}
