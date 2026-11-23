const ink = '#203e35';
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export const num = (value, digits=2) => Number(value).toLocaleString('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits});
export function txt(x,y,value,{anchor='start',size=15,color=ink,weight=550}={}) {
  return '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-family="Inter,Arial,sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'">'+escape(value)+'</text>';
}
export function line(x1,y1,x2,y2,color='#777',dash='') {
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="1.5" stroke-dasharray="'+dash+'"/>';
}
export function arrow(x1,y1,x2,y2,color='#26705e') {
  const a=Math.atan2(y2-y1,x2-x1), x=x2-8*Math.cos(a),y=y2-8*Math.sin(a),dx=4*Math.sin(a),dy=4*Math.cos(a);
  return line(x1,y1,x2,y2,color)+'<path d="M'+x2+' '+y2+' L'+(x+dx)+' '+(y-dy)+' '+(x-dx)+' '+(y+dy)+' Z" fill="'+color+'"/>';
}
export function dim(x1,y1,x2,y2,label) {
  const a=Math.atan2(y2-y1,x2-x1), dx=5*Math.sin(a),dy=5*Math.cos(a),c='#42665a';
  return line(x1,y1,x2,y2,c)+line(x1-dx,y1+dy,x1+dx,y1-dy,c)+line(x2-dx,y2+dy,x2+dx,y2-dy,c)+txt((x1+x2)/2+(Math.abs(dx)>3?10:0),(y1+y2)/2-7,label,{anchor:Math.abs(dx)>3?'start':'middle',size:14,color:c});
}
export function stone(cx,top,width,height) {
  return '<g transform="translate('+cx+' '+top+') scale('+width/100+' '+height/65+')" stroke="#567f80" stroke-width="1.3" stroke-linejoin="round"><path d="M-29 0H29L50 19V22L0 65 -50 22V19Z" fill="#ceeaeb"/><path d="M-50 19 -29 0 -16 19 0 0 17 19 29 0 50 19M-50 19H50M-50 22H50M-16 22 0 65 17 22" fill="none"/><path d="M-50 22 -16 22 0 65Z" fill="#94bdc1"/><path d="M17 22 50 22 0 65Z" fill="#b0ced1"/></g>';
}
