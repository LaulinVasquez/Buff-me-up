import {createClient} from "@/lib/supabase/server";
import {exportAccount} from "@/lib/export/account";
const privateHeaders={"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"};
export async function GET(){
 try{const client=await createClient();const {data:{user},error}=await client.auth.getUser();if(error||!user)return Response.json({error:"Please sign in to export your data."},{status:401,headers:privateHeaders});
 const exported=await exportAccount(client,user.id);return new Response(JSON.stringify(exported,null,2),{headers:{...privateHeaders,"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="buff-me-up-${exported.exportedAt.slice(0,10)}.json"`}});
 }catch{return Response.json({error:"Your export could not be completed. Please try again."},{status:500,headers:privateHeaders});}
}
