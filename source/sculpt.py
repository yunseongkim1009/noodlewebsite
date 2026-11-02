from pathlib import Path
import numpy as np,json,base64
from skimage.measure import marching_cubes
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
step=.025
origin=np.array([-.88,-.17,-2.52],dtype=np.float32)
axes=[np.arange(origin[0],.90,step,dtype=np.float32),np.arange(origin[1],2.55,step,dtype=np.float32),np.arange(origin[2],1.96,step,dtype=np.float32)]
X,Y,Z=np.meshgrid(*axes,indexing='ij');grid=np.stack([X,Y,Z],axis=-1)
components=[]
def ellipsoid(p,c,r):
 q=p-np.array(c);r=np.array(r);k0=np.sqrt(np.sum((q/r)**2,axis=-1));k1=np.sqrt(np.sum((q/(r*r))**2,axis=-1));return np.where(k1>1e-7,k0*(k0-1)/np.maximum(k1,1e-7),-min(r))
def capsule(p,a,b,r0,r1=None):
 a=np.array(a);b=np.array(b);v=b-a;q=p-a;h=np.clip(np.sum(q*v,axis=-1)/np.dot(v,v),0,1);return np.linalg.norm(q-h[...,None]*v,axis=-1)-(r0 if r1 is None else r0+(r1-r0)*h)
def add(shape,args,tag,k=.12):components.append((shape,args,tag,k))
add('ell',((0,1.03,-.62),(.57,.51,1.32)),'body')
add('ell',((0,1.04,.20),(.53,.54,.58)),'body',.18)
add('ell',((0,1.31,.53),(.38,.55,.39)),'neck',.16)
add('ell',((0,1.75,.83),(.62,.59,.56)),'head',.16)
add('ell',((0,1.56,1.28),(.43,.205,.46)),'head',.105)
legs=[]
for rear in [False,True]:
 for side in [-1,1]:
  name=('B' if rear else 'F')+('L' if side<0 else 'R');x=side*.43;hy=.94 if rear else .92;z=-1.25 if rear else .32
  add('cap',((x,hy,z),(x,hy-.43,z),.225 if rear else .165,.135),name,.11)
  add('cap',((x,hy-.43,z),(x,.15,z+.025),.13,.12),name,.085)
  add('ell',((x,.105,z+.10),(.215,.105,.29)),name,.09)
  legs.append((name,x,hy,z))
for args,tag in [(((0,1.09,-1.83),(0,1.28,-2.08),.105,.095),'tail1'),(((0,1.28,-2.08),(0,1.63,-2.27),.095,.083),'tail2'),(((0,1.63,-2.27),(0,1.98,-2.29),.083,.07),'tail3')]:add('cap',args,tag,.07)
def smoothmin(a,b,k):
 h=np.maximum(k-np.abs(a-b),0)/k;return np.minimum(a,b)-h*h*k*.25
def field(p,parts=False):
 ds=[];d=None
 for kind,args,tag,k in components:
  v=ellipsoid(p,*args) if kind=='ell' else capsule(p,*args)
  if parts:ds.append(v)
  d=v if d is None else smoothmin(d,v,k)
 return (d,np.stack(ds,axis=-1)) if parts else d
values=field(grid).astype(np.float32)
verts,faces,_,_=marching_cubes(values,0,spacing=(step,step,step),gradient_direction='ascent',allow_degenerate=False)
verts+=origin
# True field-gradient normals avoid a faceted/assembled surface across blended volumes.
eps=.0035;normals=[]
for axis in range(3):
 delta=np.zeros(3);delta[axis]=eps;normals.append(field(verts+delta)-field(verts-delta))
normals=np.stack(normals,axis=-1);normals/=np.maximum(np.linalg.norm(normals,axis=-1,keepdims=True),1e-8)
cross=np.cross(verts[faces[:,1]]-verts[faces[:,0]],verts[faces[:,2]]-verts[faces[:,0]])
bad=np.sum(cross*normals[faces].mean(axis=1),axis=1)<0
faces[bad]=faces[bad][:,[0,2,1]]
# One welded skin, weighted to a 19-bone quadruped rig.
bones=[{'name':'root','parent':-1,'position':[0,0,0]}, {'name':'hips','parent':0,'position':[0,1,-1.2]}, {'name':'chest','parent':0,'position':[0,1,.32]}, {'name':'head','parent':2,'position':[0,1.55,.72]}]
legids={}
for name,x,hy,z in legs:
 parent=1 if name.startswith('B') else 2;idx=len(bones);legids[name]=idx
 bones.extend([{'name':name+'Upper','parent':parent,'position':[x,hy,z]},{'name':name+'Lower','parent':idx,'position':[x,hy-.43,z]},{'name':name+'Foot','parent':idx+1,'position':[x,hy-.83,z]}])
for name,parent,position in [('tail1',1,[0,1.09,-1.83]),('tail2',16,[0,1.45,-2.18]),('tail3',17,[0,1.80,-2.29])]:bones.append({'name':name,'parent':parent,'position':position})
_,ds=field(verts,True);distmin=ds.min(axis=-1,keepdims=True)
pw=np.exp(np.clip(-(ds-distmin)/.055,-70,0));pw/=pw.sum(axis=1,keepdims=True)
weights=np.zeros((len(verts),len(bones)),dtype=np.float32)
def smooth(a,b,x):
 u=np.clip((x-a)/(b-a),0,1);return u*u*(3-2*u)
x,y,z=verts.T
bodyfront=smooth(-1.2,.32,z)
for j,(_,args,tag,_) in enumerate(components):
 w=pw[:,j]
 if tag=='body':weights[:,1]+=w*(1-bodyfront);weights[:,2]+=w*bodyfront
 elif tag=='neck':
  h=smooth(1.17,1.64,y);weights[:,2]+=w*(1-h);weights[:,3]+=w*h
 elif tag=='head':weights[:,3]+=w
 elif tag in legids:
  i=legids[tag];knee=smooth(.36,.64,y);foot=1-smooth(.13,.31,y)
  weights[:,i]+=w*knee;weights[:,i+1]+=w*(1-knee)*(1-foot);weights[:,i+2]+=w*(1-knee)*foot
 else:
  idx={'tail1':16,'tail2':17,'tail3':18}[tag];weights[:,idx]+=w
inds=np.argsort(-weights,axis=1)[:,:4].astype(np.uint8);w4=np.take_along_axis(weights,inds,axis=1);w4/=w4.sum(axis=1,keepdims=True)
quant=np.round(w4*255).astype(np.int16);quant[:,0]+=255-quant.sum(axis=1);quant=quant.astype(np.uint8)
# Paint belongs to the single surface; no floating chest, belly, collar or body-patch meshes.
def color(h):return np.array([int(h[i:i+2],16)/255 for i in [0,2,4]])
colors=np.tile(color('e0b16c'),(len(verts),1))
def paint(rgb,mask):
 global colors
 colors=colors*(1-mask[:,None])+color(rgb)*mask[:,None]
muzzle=smooth(1.04,1.23,z)*(1-smooth(1.75,1.84,y))*smooth(1.19,1.36,y)
paint('f3dcb0',muzzle)
belly=(1-smooth(.67,.82,y))*(1-smooth(.38,.47,np.abs(x)))*smooth(-1.6,-1.4,z)*(1-smooth(.10,.35,z))
paint('f1d8aa',belly)
patch=((z+.67)/.39)**2+((y-1.25)/.21)**2
paint('b8894c',(1-smooth(.88,1.10,patch))*smooth(.44,.51,np.abs(x)))
plane=(y-1.25)*.93-(z-.55)*.36
collar=(1-smooth(.048,.075,np.abs(plane)))*smooth(.06,.16,z)*(1-smooth(.54,.61,np.abs(x)))
paint('c4402c',collar)
linear=np.where(colors<=.04045,colors/12.92,((colors+.055)/1.055)**2.4)
colors=np.clip(np.round(linear*255),0,255).astype(np.uint8)
# Store an embedded, compact binary mesh; no model download at runtime.
arrays={'position':verts.astype('<f4'),'normal':np.round(normals*32767).astype('<i2'),'color':colors,'skinIndex':inds,'skinWeight':quant,'index':faces.astype('<u2' if len(verts)<65536 else '<u4').reshape(-1)}
blob=bytearray();attrs={}
for name,a in arrays.items():
 while len(blob)%4:blob.append(0)
 attrs[name]={'offset':len(blob),'count':a.size,'type':str(a.dtype),'itemSize':3 if name in ['position','normal','color'] else 4 if name in ['skinIndex','skinWeight'] else 1};blob.extend(a.tobytes())
meta={'attributes':attrs,'bones':bones,'vertexCount':len(verts),'triangleCount':len(faces),'data':base64.b64encode(blob).decode()}
Path(__file__).with_name('sculpt-data.json').write_text(json.dumps(meta,separators=(',',':')))
# Connectivity verifies the body/head/limbs/tail are not a pile of intersecting parts.
edges=np.concatenate([faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]]]);graph=coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(verts),len(verts)))
count,_=connected_components(graph,directed=False)
assert count==1,count
result={'vertices':len(verts),'triangles':len(faces),'skin_bones':len(bones),'connected_components':int(count),'binary_bytes':len(blob),'bounds':[verts.min(axis=0).tolist(),verts.max(axis=0).tolist()]}
Path(__file__).with_name('mesh-audit.json').write_text(json.dumps(result,indent=2));print(result)
