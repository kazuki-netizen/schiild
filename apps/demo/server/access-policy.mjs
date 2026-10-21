// DEMO ONLY. Public reads never inherit a legacy browser participant identity.
import {ApiError} from './atelier-core.mjs';
const publicActions=new Set(['directory','preview','global','global.schiils','global.archive','public.atelier','public.work']);
export function isLineParticipant(actor){return Boolean(actor?.sessionKey&&/^[a-f0-9]{64}$/.test(actor.account?.lineSubject??''));}
export async function actorForAction(auth,action,credential){
 let actor;
 try{actor=await auth.identity(credential);}catch(error){if(!publicActions.has(action))throw error;}
 if(isLineParticipant(actor))return actor;
 if(publicActions.has(action))return {member:'public-visitor',account:null};
 throw new ApiError(403,'line_required');
}
