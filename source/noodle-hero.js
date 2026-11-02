/* Noodle v7: one sculpted skinned surface, planted-foot IK, one cinematic clock. */
(function(){
'use strict';
const T=window.THREE,host=document.getElementById('introDog');let renderer;
try{if(!T)throw Error('Three unavailable');renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch(e){document.body.classList.add('noodle-fallback');window.dispatchEvent(new Event('noodle:ready'));return;}
const canvas=renderer.domElement;canvas.id='noodleCanvas';canvas.setAttribute('aria-hidden','true');host.appendChild(canvas);
renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.06,160);camera.position.set(0,1.3,30);
scene.add(new T.HemisphereLight(0xfff5e2,0xb39a77,1.65));const key=new T.DirectionalLight(0xffeed6,2.2);key.position.set(-4,6,8);scene.add(key);const fill=new T.DirectionalLight(0xffffff,.55);fill.position.set(5,3,4);scene.add(fill);
const mat=(color,roughness=.94)=>new T.MeshStandardMaterial({color,roughness,metalness:0});
const dark=mat('#251d15',.65),cream=mat('#f2d8a9'),earMat=mat('#71431e'),pink=mat('#cc756b'),white=mat('#fff8de'),gold=mat('#e6b832',.6);
const dog=new T.Group();scene.add(dog);
const D=JSON.parse(document.getElementById('noodleModel').textContent),raw=atob(D.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
const types={float32:Float32Array,int16:Int16Array,uint8:Uint8Array,uint16:Uint16Array,uint32:Uint32Array},geometry=new T.BufferGeometry();
for(const [name,a]of Object.entries(D.attributes)){const array=new types[a.type](bytes.buffer,a.offset,a.count);const attr=new T.BufferAttribute(array,a.itemSize,['normal','color','skinWeight'].includes(name));if(name==='index')geometry.setIndex(attr);else geometry.setAttribute(name,attr);}
const skinMaterial=new T.MeshStandardMaterial({color:0xffffff,roughness:.96,metalness:0});
const rgb=hex=>{const c=new T.Color(hex);return `vec3(${c.r.toFixed(6)},${c.g.toFixed(6)},${c.b.toFixed(6)})`;};
skinMaterial.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 vNoodleRest;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNoodleRest=position;');
 shader.fragmentShader='varying vec3 vNoodleRest;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
 vec3 nP=vNoodleRest;vec3 nColor=${rgb('#d4a35e')};
 float nM=smoothstep(1.04,1.23,nP.z)*(1.0-smoothstep(1.75,1.84,nP.y))*smoothstep(1.19,1.36,nP.y);
 nColor=mix(nColor,${rgb('#f3dcb0')},nM);
 float nB=(1.0-smoothstep(.67,.82,nP.y))*(1.0-smoothstep(.38,.47,abs(nP.x)))*smoothstep(-1.6,-1.4,nP.z)*(1.0-smoothstep(.10,.35,nP.z));
 nColor=mix(nColor,${rgb('#f1d8aa')},nB);
 float nPatch=pow((nP.z+.67)/.39,2.0)+pow((nP.y-1.25)/.21,2.0);float nAA=max(fwidth(nPatch),.015);
 nColor=mix(nColor,${rgb('#b8894c')},(1.0-smoothstep(1.0-nAA,1.0+nAA,nPatch))*smoothstep(.44,.51,abs(nP.x)));
 float nPlane=(nP.y-1.25)*.82+(nP.z-.55)*.57;float nCA=max(fwidth(nPlane),.003);
 float nCollar=(1.0-smoothstep(.057-nCA,.057+nCA,abs(nPlane)))*smoothstep(.06,.16,nP.z)*(1.0-smoothstep(.90,.99,nP.z))*smoothstep(.88,.96,nP.y)*(1.0-smoothstep(1.49,1.56,nP.y));
 diffuseColor.rgb=nColor=mix(nColor,${rgb('#c4402c')},nCollar);
 `);
};const skin=new T.SkinnedMesh(geometry,skinMaterial);skin.frustumCulled=false;dog.add(skin);
const bones=D.bones.map(()=>new T.Bone());D.bones.forEach((b,i)=>{bones[i].name=b.name;const p=b.position,parent=b.parent;if(parent<0){bones[i].position.set(...p);skin.add(bones[i]);}else{const q=D.bones[parent].position;bones[i].position.set(p[0]-q[0],p[1]-q[1],p[2]-q[2]);bones[parent].add(bones[i]);}});const skeleton=new T.Skeleton(bones);skin.bind(skeleton);
const sphere=new T.SphereGeometry(1,32,20);
function oval(parent,material,p,s){const m=new T.Mesh(sphere,material);m.position.set(...p);m.scale.set(...s);parent.add(m);return m;}
function tube(parent,points,r,material){const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const m=new T.Mesh(new T.TubeGeometry(c,48,r,7,false),material);parent.add(m);return m;}
const head=bones[3];
for(const side of[-1,1]){oval(head,dark,[side*.275,.31,.61],[.074,.089,.037]);oval(head,white,[side*.275-.019,.34,.648],[.017,.021,.009]);}
// Facial features attach to the same moving skull; the muzzle itself is part of the welded skin.
oval(head,dark,[0,.09,.98],[.12,.075,.075]);
const earGeometry=new T.SphereGeometry(1,32,24),ep=earGeometry.attributes.position;for(let i=0;i<ep.count;i++){const x=ep.getX(i),y=ep.getY(i),z=ep.getZ(i),u=(1-y)/2;ep.setXYZ(i,x*.225*(.82+.18*u),-1.035*u,z*.115+.12*Math.sin(Math.PI*u)-.04*u);}earGeometry.computeVertexNormals();
const ears=[];for(const side of[-1,1]){const ear=new T.Group();ear.position.set(side*.56,.43,-.035);ear.rotation.z=side*.065;head.add(ear);const flap=new T.Mesh(earGeometry,earMat);flap.position.x=side*.045;ear.add(flap);ears.push(ear);}
const mouth=oval(head,dark,[0,-.18,.66],[.365,.13,.27]);
const jaw=new T.Group();jaw.position.set(0,-.15,.36);head.add(jaw);oval(jaw,cream,[0,-.045,.30],[.37,.105,.39]);const tongue=oval(jaw,pink,[0,.038,.46],[.125,.022,.15]);
oval(bones[2],gold,[0,.04,.52],[.095,.12,.035]);
const ball=new T.Group();scene.add(ball);oval(ball,mat('#b7cc34',1),[0,0,0],[.18,.18,.18]);const seam=[];for(let i=0;i<=128;i++){const a=i*Math.PI*2/128,lat=.44*Math.cos(a*2);seam.push([.183*Math.cos(lat)*Math.cos(a),.183*Math.sin(lat),.183*Math.cos(lat)*Math.sin(a)]);}tube(ball,seam,.006,white);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,3,64,64,64);gradient.addColorStop(0,'rgba(47,32,14,.28)');gradient.addColorStop(.5,'rgba(47,32,14,.12)');gradient.addColorStop(1,'rgba(47,32,14,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);const shadowMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});const shadow=new T.Mesh(new T.PlaneGeometry(3.7,.43),shadowMat);scene.add(shadow);
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},quint=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);},mix=(a,b,t)=>a+(b-a)*t;
function track(keys,t){if(t<=keys[0][0])return keys[0][1];const n=keys.length;if(t>=keys[n-1][0])return keys[n-1][1];const ds=[],hs=[],ms=new Array(n).fill(0);for(let i=0;i<n-1;i++){hs[i]=keys[i+1][0]-keys[i][0];ds[i]=(keys[i+1][1]-keys[i][1])/hs[i];}for(let i=1;i<n-1;i++)if(ds[i-1]*ds[i]>0){const w1=2*hs[i]+hs[i-1],w2=hs[i]+2*hs[i-1];ms[i]=(w1+w2)/(w1/ds[i-1]+w2/ds[i]);}let i=0;while(t>keys[i+1][0])i++;const u=(t-keys[i][0])/hs[i],u2=u*u,u3=u2*u;return(2*u3-3*u2+1)*keys[i][1]+(u3-2*u2+u)*hs[i]*ms[i]+(-2*u3+3*u2)*keys[i+1][1]+(u3-u2)*hs[i]*ms[i+1];}
const legs=[{i:4,rear:false,phase:0,z:.32},{i:7,rear:false,phase:.5,z:.32},{i:10,rear:true,phase:.25,z:-1.25},{i:13,rear:true,phase:.75,z:-1.25}];
const cadence=1.65,velocity=1.05,duty=.61,stride=velocity*duty/cadence;
function footstep(clock,phase){const u=((clock*cadence+phase)%1+1)%1;if(u<duty)return{z:stride*.5-velocity*u/cadence,y:.105,pitch:0,stance:true};const s=(u-duty)/(1-duty),s2=s*s,s3=s2*s,dur=(1-duty)/cadence,m=-velocity*dur;return{z:(2*s3-3*s2+1)*(-stride*.5)+(s3-2*s2+s)*m+(-2*s3+3*s2)*(stride*.5)+(s3-s2)*m,y:.105+.14*16*s2*(1-s)*(1-s),pitch:.16*Math.sin(s*Math.PI*2),stance:false};}
let maxIKError=0;
function solveLeg(l,targetY,targetZ,pitch){const upper=bones[l.i],lower=bones[l.i+1],foot=bones[l.i+2],parent=upper.parent;const hipY=parent.position.y+upper.position.y,hipZ=parent.position.z+upper.position.z;const dy=targetY-hipY,dz=targetZ-hipZ,L1=.43,L2=.4,d=Math.min(.828,Math.max(.12,Math.hypot(dy,dz)));let knee=Math.acos(Math.max(-1,Math.min(1,(d*d-L1*L1-L2*L2)/(2*L1*L2))));if(!l.rear)knee=-knee;const angle=Math.atan2(-dz,-dy)-Math.atan2(L2*Math.sin(knee),L1+L2*Math.cos(knee));upper.rotation.x=angle;lower.rotation.x=knee;foot.rotation.x=-angle-knee+pitch;
 const actualY=hipY-L1*Math.cos(angle)-L2*Math.cos(angle+knee),actualZ=hipZ-L1*Math.sin(angle)-L2*Math.sin(angle+knee);maxIKError=Math.max(maxIKError,Math.hypot(actualY-targetY,actualZ-targetZ));}
function pose(t){const sit=quint((t-6.55)/.95),crouch=.085*16*Math.pow(clamp((t-1.35)/.35),2)*Math.pow(1-clamp((t-1.35)/.35),2),landing=.07*16*Math.pow(clamp((t-5.18)/.38),2)*Math.pow(1-clamp((t-5.18)/.38),2);bones[1].position.y=mix(.96,.48,sit)-crouch-landing;bones[2].position.y=.97-crouch-landing;
 head.rotation.set(-.025-.045*smooth((t-1.7)/.9)-.07*sit,-.20*sit,0);if(mood==='moping'&&sit)head.rotation.x+=.12;if(mood==='proud'&&sit)head.rotation.x-=.045;
 const airborne=smooth((t-1.65)/.42)*(1-smooth((t-4.75)/.5));const walkClock=t<4?t:Math.max(0,t-5.35),walkWeight=t<4?1: smooth((t-5.22)/.35)*(1-quint((t-6.32)/.5));
 maxIKError=0;for(const l of legs){const f=footstep(walkClock,l.phase),groundZ=l.z+f.z*walkWeight;let y=mix(.105,f.y,walkWeight),z=groundZ;const reach=smooth((t-2.4)/.6);y=mix(y,l.rear?.46:mix(.43,.32,reach),airborne);z=mix(z,l.rear?-1.03:mix(.48,.62,reach),airborne);y=mix(y,.105,sit);z=mix(z,l.rear?-.99:.32,sit);solveLeg(l,y+(l.rear?.005:-.015),z,f.pitch*walkWeight*(1-airborne)*(1-sit));}
 const open=smooth((t-2.42)/.6);jaw.rotation.x=mix(.055,.47,open)*(1-smooth((t-3.5)/.52))+.23*smooth((t-3.5)/.52);tongue.visible=t<3.5;
 ears.forEach((e,i)=>{e.rotation.x=.14*smooth((t-1.55)/.5)*(1-smooth((t-2.6)/.45));});bones[16].rotation.z=.06*Math.sin(Math.min(t,1.4)*2.5)*(1-smooth((t-1.4)/.25));bones[17].rotation.z=0;bones[18].rotation.z=0;
 return{sit,crouch,landing};}
let width=1,height=1,end={x:0,y:7,z:28},lastTime=0,finished=false,stopped=false,start=null,pausedAt=null,pauseTotal=0,raf=0,resizeFrame=0,mood='neutral',offline=false,previousRaf=null;
const intervals=[];
function bounds(){dog.updateMatrixWorld(true);skeleton.update();camera.updateMatrixWorld(true);let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;const p=new T.Vector3();dog.traverse(o=>{if(!o.isMesh||!o.visible)return;const count=o.geometry.attributes.position.count,step=o===skin?10:3;for(let i=0;i<count;i+=step){if(o===skin)o.getVertexPosition(i,p);else p.fromBufferAttribute(o.geometry.attributes.position,i);p.applyMatrix4(o.matrixWorld).project(camera);const x=(p.x+1)*width/2,y=(1-p.y)*height/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}});return{left,right,top,bottom,width:right-left,height:bottom-top};}
function layoutEnd(){pose(7.5);dog.position.set(0,0,0);dog.rotation.set(0,-.72,0);camera.position.set(0,1.3,28);const target=width<761?Math.min(125,width*.29):width*.14;let lo=5,hi=100;for(let i=0;i<23;i++){camera.position.z=(lo+hi)/2;const b=bounds();if(b.width>target)lo=camera.position.z;else hi=camera.position.z;}for(let i=0;i<4;i++){const b=bounds(),unit=2*Math.tan(Math.PI/10)*camera.position.z/height;camera.position.x-=(width-20-b.right)*unit;camera.position.y+=(height-15-b.bottom)*unit;}end={x:camera.position.x,y:camera.position.y,z:camera.position.z};const b=bounds(),companion=document.getElementById('companion');companion.style.setProperty('--noodle-width',Math.ceil(b.width+12)+'px');companion.style.setProperty('--noodle-height',Math.ceil(b.height)+'px');canvas.dataset.finalBounds=JSON.stringify(b);}
function performanceResult(){const s=[...intervals].sort((a,b)=>a-b),p=q=>s[Math.min(s.length-1,Math.floor(s.length*q))]||0;return{renderedFrames:intervals.length+1,medianFrameMs:p(.5),p95FrameMs:p(.95),over25ms:intervals.filter(x=>x>25).length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}
function complete(){if(finished)return;finished=true;canvas.dataset.performance=JSON.stringify(performanceResult());document.body.classList.add('noodle-settled');window.dispatchEvent(new Event('noodle:finished'));}
function draw(t){lastTime=t;const {sit,crouch,landing}=pose(t);const flight=track([[0,0],[1.65,0],[2.8,.5],[4.5,.5],[5.25,1],[7.5,1]],t),jump=4*1.0*flight*(1-flight);const forward=t<1.65?velocity*t:velocity*1.65+2*flight;const retreat=Math.max(0,Math.min(1.25,t-5.35));dog.position.set(velocity*retreat,jump,forward);dog.rotation.y=track([[0,-.78],[1.55,-.08],[2.7,0],[4.5,0],[5.35,1.30],[6.12,1.30],[7.05,-.72],[7.5,-.72]],t);
 const close=width/height<.8?3.6:2.70,closeEye=width/height<.8?1.65:1.55;const sep=track([[0,30],[.8,26.5],[1.55,18],[2.45,7.5],[3,close],[4.5,close],[5.35,17],[6.95,end.z],[7.5,end.z]],t);const pan=track([[0,0],[5.35,0],[6.95,end.x],[7.5,end.x]],t);const eye=track([[0,1.30],[2.1,1.30],[3,closeEye],[4.5,closeEye],[5.35,1.30],[6.95,end.y],[7.5,end.y]],t);const follow=smooth((t-2.10)/.9)*(1-smooth((t-4.5)/.75));camera.position.set(dog.position.x+pan,eye+jump*follow,dog.position.z+sep);camera.updateMatrixWorld(true);dog.updateMatrixWorld(true);
 const caught=head.localToWorld(new T.Vector3(0,-.17,.91));const free=new T.Vector3(.65, .36+2.35*Math.sin(Math.min(t/3,1)*Math.PI*.65),3.30+.30*Math.min(t,3));ball.position.copy(free.lerp(caught,quint((t-2.72)/.83)));ball.rotation.set(Math.min(t,3.55)*.6,Math.min(t,3.55)*1.2,.2);
 shadow.position.set(dog.position.x,.035,dog.position.z-.45);shadow.scale.setScalar(1-.22*jump);shadowMat.opacity=.8-.55*jump;
 renderer.render(scene,camera);canvas.dataset.time=t.toFixed(4);canvas.dataset.stage=t<1.65?'walk':t<3?'jump':t<4.5?'catch':t<6.55?'retreat':'sit';canvas.dataset.ikError=maxIKError.toFixed(6);canvas.dataset.draws=String(renderer.info.render.calls);canvas.dataset.connectedMesh='1';if(t>=7.5)complete();}
function resize(){const w=innerWidth,h=innerHeight;if(w===width&&h===height)return;width=w;height=h;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();layoutEnd();draw(lastTime);}
function onResize(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize);}
function tick(now){if(stopped||finished||offline)return;raf=requestAnimationFrame(tick);if(document.hidden)return;if(start===null){start=now;pauseTotal=0;}if(previousRaf!==null)intervals.push(now-previousRaf);previousRaf=now;draw(Math.min(7.5,Math.max(0,(now-start-pauseTotal)/1000)));}
window.NoodleHero={finish(){draw(7.5);},renderFrame(t){offline=true;cancelAnimationFrame(raf);draw(t);},get frame(){return lastTime;}};
const observer=new MutationObserver(()=>{mood=document.querySelector('.mood-card.selected')?.dataset.mood||'neutral';if(finished)draw(7.5);});document.querySelectorAll('.mood-card').forEach(b=>observer.observe(b,{attributes:true,attributeFilter:['class']}));const onVisibility=()=>{if(document.hidden){if(start!==null)pausedAt=performance.now();}else if(pausedAt!==null){pauseTotal+=performance.now()-pausedAt;pausedAt=null;previousRaf=null;}};document.addEventListener('visibilitychange',onVisibility);window.addEventListener('resize',onResize);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);document.body.classList.remove('noodle-3d');document.body.classList.add('noodle-fallback');window.dispatchEvent(new Event('noodle:finished'));});window.addEventListener('pagehide',event=>{if(event.persisted)return;stopped=true;cancelAnimationFrame(raf);cancelAnimationFrame(resizeFrame);observer.disconnect();window.removeEventListener('resize',onResize);document.removeEventListener('visibilitychange',onVisibility);const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});renderer.dispose();});
document.body.classList.add('noodle-3d');resize();window.dispatchEvent(new Event('noodle:ready'));
const params=new URLSearchParams(location.search),local=location.hostname==='127.0.0.1';if(local&&params.has('noodle-frame')){offline=true;draw(Number(params.get('noodle-frame'))||0);}else if(local&&params.has('noodle-capture'))offline=true;else raf=requestAnimationFrame(()=>{raf=requestAnimationFrame(tick);});
})();
