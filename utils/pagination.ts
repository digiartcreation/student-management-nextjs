export const pagination = (page:number,size:number,totalElements:number)=>({page,size,totalElements,totalPages:Math.ceil(totalElements/size)});
