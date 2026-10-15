// DEMO ONLY. Keep the 128-unit layout stable and sample new works at 256 pixels.
export const LOGICAL_SIZE=128;
export const WORK_SIZE=256;
export function workSize(record?:{outputSize?:number;status?:string}){return record?.outputSize===128||record?.outputSize===256?record.outputSize:record?.status==='ready'||record?.status==='generating'?128:WORK_SIZE;}
