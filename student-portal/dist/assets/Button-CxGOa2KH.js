import{A as e,C as t,D as n,I as r,N as i,P as a,d as o,g as s,j as c,m as l,n as u,p as d,u as ee}from"./PageHeader-DG8Hz5UV.js";var f=class extends d{#e;#t;#n;#r;constructor(e){super(),this.#e=e.client,this.mutationId=e.mutationId,this.#n=e.mutationCache,this.#t=[],this.state=e.state||p(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){this.#t.includes(e)||(this.#t.push(e),this.clearGcTimeout(),this.#n.notify({type:`observerAdded`,mutation:this,observer:e}))}removeObserver(e){this.#t=this.#t.filter(t=>t!==e),this.scheduleGc(),this.#n.notify({type:`observerRemoved`,mutation:this,observer:e})}optionalRemove(){this.#t.length||(this.state.status===`pending`?this.scheduleGc():this.#n.remove(this))}continue(){return this.#r?.continue()??this.execute(this.state.variables)}async execute(e){let t=()=>{this.#i({type:`continue`})},n={client:this.#e,meta:this.options.meta,mutationKey:this.options.mutationKey};this.#r=l({fn:()=>this.options.mutationFn?this.options.mutationFn(e,n):Promise.reject(Error(`No mutationFn found`)),onFail:(e,t)=>{this.#i({type:`failed`,failureCount:e,error:t})},onPause:()=>{this.#i({type:`pause`})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>this.#n.canRun(this)});let r=this.state.status===`pending`,i=!this.#r.canStart();try{if(r)t();else{this.#i({type:`pending`,variables:e,isPaused:i}),this.#n.config.onMutate&&await this.#n.config.onMutate(e,this,n);let t=await this.options.onMutate?.(e,n);t!==this.state.context&&this.#i({type:`pending`,context:t,variables:e,isPaused:i})}let a=await this.#r.start();return await this.#n.config.onSuccess?.(a,e,this.state.context,this,n),await this.options.onSuccess?.(a,e,this.state.context,n),await this.#n.config.onSettled?.(a,null,this.state.variables,this.state.context,this,n),await this.options.onSettled?.(a,null,e,this.state.context,n),this.#i({type:`success`,data:a}),a}catch(t){try{await this.#n.config.onError?.(t,e,this.state.context,this,n)}catch(e){Promise.reject(e)}try{await this.options.onError?.(t,e,this.state.context,n)}catch(e){Promise.reject(e)}try{await this.#n.config.onSettled?.(void 0,t,this.state.variables,this.state.context,this,n)}catch(e){Promise.reject(e)}try{await this.options.onSettled?.(void 0,t,e,this.state.context,n)}catch(e){Promise.reject(e)}throw this.#i({type:`error`,error:t}),t}finally{this.#n.runNext(this)}}#i(e){this.state=(t=>{switch(e.type){case`failed`:return{...t,failureCount:e.failureCount,failureReason:e.error};case`pause`:return{...t,isPaused:!0};case`continue`:return{...t,isPaused:!1};case`pending`:return{...t,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:`pending`,variables:e.variables,submittedAt:Date.now()};case`success`:return{...t,data:e.data,failureCount:0,failureReason:null,error:null,status:`success`,isPaused:!1};case`error`:return{...t,data:void 0,error:e.error,failureCount:t.failureCount+1,failureReason:e.error,isPaused:!1,status:`error`}}})(this.state),s.batch(()=>{this.#t.forEach(t=>{t.onMutationUpdate(e)}),this.#n.notify({mutation:this,type:`updated`,action:e})})}};function p(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:`idle`,variables:void 0,submittedAt:0}}var m=class extends i{#e;#t=void 0;#n;#r;constructor(e,t){super(),this.#e=e,this.setOptions(t),this.bindMethods(),this.#i()}bindMethods(){this.mutate=this.mutate.bind(this),this.reset=this.reset.bind(this)}setOptions(n){let r=this.options;this.options=this.#e.defaultMutationOptions(n),e(this.options,r)||this.#e.getMutationCache().notify({type:`observerOptionsUpdated`,mutation:this.#n,observer:this}),r?.mutationKey&&this.options.mutationKey&&t(r.mutationKey)!==t(this.options.mutationKey)?this.reset():this.#n?.state.status===`pending`&&this.#n.setOptions(this.options)}onUnsubscribe(){this.hasListeners()||this.#n?.removeObserver(this)}onMutationUpdate(e){this.#i(),this.#a(e)}getCurrentResult(){return this.#t}reset(){this.#n?.removeObserver(this),this.#n=void 0,this.#i(),this.#a()}mutate(e,t){return this.#r=t,this.#n?.removeObserver(this),this.#n=this.#e.getMutationCache().build(this.#e,this.options),this.#n.addObserver(this),this.#n.execute(e)}#i(){let e=this.#n?.state??p();this.#t={...e,isPending:e.status===`pending`,isSuccess:e.status===`success`,isError:e.status===`error`,isIdle:e.status===`idle`,mutate:this.mutate,reset:this.reset}}#a(e){s.batch(()=>{if(this.#r&&this.hasListeners()){let t=this.#t.variables,n=this.#t.context,r={client:this.#e,meta:this.options.meta,mutationKey:this.options.mutationKey};if(e?.type===`success`){try{this.#r.onSuccess?.(e.data,t,n,r)}catch(e){Promise.reject(e)}try{this.#r.onSettled?.(e.data,null,t,n,r)}catch(e){Promise.reject(e)}}else if(e?.type===`error`){try{this.#r.onError?.(e.error,t,n,r)}catch(e){Promise.reject(e)}try{this.#r.onSettled?.(void 0,e.error,t,n,r)}catch(e){Promise.reject(e)}}}this.listeners.forEach(e=>{e(this.#t)})})}},h=r(a(),1);function g(e,t){let r=ee(t),[i]=h.useState(()=>new m(r,e));h.useEffect(()=>{i.setOptions(e)},[i,e]);let a=h.useSyncExternalStore(h.useCallback(e=>i.subscribe(s.batchCalls(e)),[i]),()=>i.getCurrentResult(),()=>i.getCurrentResult()),o=h.useCallback((e,t)=>{i.mutate(e,t).catch(n)},[i]);if(a.error&&c(i.options.throwOnError,[a.error]))throw a.error;return{...a,mutate:o,mutateAsync:a.mutate}}var _={data:``},te=e=>{if(typeof window==`object`){let t=(e?e.querySelector(`#_goober`):window._goober)||Object.assign(document.createElement(`style`),{innerHTML:` `,id:`_goober`});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||_},ne=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,v=/\/\*[^]*?\*\/|  +/g,y=/\n+/g,b=(e,t)=>{let n=``,r=``,i=``;for(let a in e){let o=e[a];a[0]==`@`?a[1]==`i`?n=a+` `+o+`;`:r+=a[1]==`f`?b(o,a):a+`{`+b(o,a[1]==`k`?``:t)+`}`:typeof o==`object`?r+=b(o,t?t.replace(/([^,])+/g,e=>a.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+` `+t:t)):a):o!=null&&(a=/^--/.test(a)?a:a.replace(/[A-Z]/g,`-$&`).toLowerCase(),i+=b.p?b.p(a,o):a+`:`+o+`;`)}return n+(t&&i?t+`{`+i+`}`:i)+r},x={},S=e=>{if(typeof e==`object`){let t=``;for(let n in e)t+=n+S(e[n]);return t}return e},C=(e,t,n,r,i)=>{let a=S(e),o=x[a]||(x[a]=(e=>{let t=0,n=11;for(;t<e.length;)n=101*n+e.charCodeAt(t++)>>>0;return`go`+n})(a));if(!x[o]){let t=a===e?(e=>{let t,n,r=[{}];for(;t=ne.exec(e.replace(v,``));)t[4]?r.shift():t[3]?(n=t[3].replace(y,` `).trim(),r.unshift(r[0][n]=r[0][n]||{})):r[0][t[1]]=t[2].replace(y,` `).trim();return r[0]})(e):e;x[o]=b(i?{[`@keyframes `+o]:t}:t,n?``:`.`+o)}let s=n&&x.g?x.g:null;return n&&(x.g=x[o]),((e,t,n,r)=>{r?t.data=t.data.replace(r,e):t.data.indexOf(e)===-1&&(t.data=n?e+t.data:t.data+e)})(x[o],t,r,s),o},w=(e,t,n)=>e.reduce((e,r,i)=>{let a=t[i];if(a&&a.call){let e=a(n),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;a=t?`.`+t:e&&typeof e==`object`?e.props?``:b(e,``):!1===e?``:e}return e+r+(a??``)},``);function T(e){let t=this||{},n=e.call?e(t.p):e;return C(n.unshift?n.raw?w(n,[].slice.call(arguments,1),t.p):n.reduce((e,n)=>Object.assign(e,n&&n.call?n(t.p):n),{}):n,te(t.target),t.g,t.o,t.k)}var E,D,O;T.bind({g:1});var k=T.bind({k:1});function A(e,t,n,r){b.p=t,E=e,D=n,O=r}function j(e,t){let n=this||{};return function(){let r=arguments;function i(a,o){let s=Object.assign({},a),c=s.className||i.className;n.p=Object.assign({theme:D&&D()},s),n.o=/ *go\d+/.test(c),s.className=T.apply(n,r)+(c?` `+c:``),t&&(s.ref=o);let l=e;return e[0]&&(l=s.as||e,delete s.as),O&&l[0]&&O(s),E(l,s)}return t?t(i):i}}var M=e=>typeof e==`function`,N=(e,t)=>M(e)?e(t):e,re=(()=>{let e=0;return()=>(++e).toString()})(),P=(()=>{let e;return()=>{if(e===void 0&&typeof window<`u`){let t=matchMedia(`(prefers-reduced-motion: reduce)`);e=!t||t.matches}return e}})(),ie=20,F=`default`,I=(e,t)=>{let{toastLimit:n}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,n)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:r}=t;return I(e,{type:e.toasts.find(e=>e.id===r.id)?1:0,toast:r});case 3:let{toastId:i}=t;return{...e,toasts:e.toasts.map(e=>e.id===i||i===void 0?{...e,dismissed:!0,visible:!1}:e)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let a=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+a}))}}},L=[],R={toasts:[],pausedAt:void 0,settings:{toastLimit:ie}},z={},B=(e,t=F)=>{z[t]=I(z[t]||R,e),L.forEach(([e,n])=>{e===t&&n(z[t])})},V=e=>Object.keys(z).forEach(t=>B(e,t)),H=e=>Object.keys(z).find(t=>z[t].toasts.some(t=>t.id===e)),U=(e=F)=>t=>{B(t,e)},W={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},G=(e={},t=F)=>{let[n,r]=(0,h.useState)(z[t]||R),i=(0,h.useRef)(z[t]);(0,h.useEffect)(()=>(i.current!==z[t]&&r(z[t]),L.push([t,r]),()=>{let e=L.findIndex(([e])=>e===t);e>-1&&L.splice(e,1)}),[t]);let a=n.toasts.map(t=>({...e,...e[t.type],...t,removeDelay:t.removeDelay||e[t.type]?.removeDelay||e?.removeDelay,duration:t.duration||e[t.type]?.duration||e?.duration||W[t.type],style:{...e.style,...e[t.type]?.style,...t.style}}));return{...n,toasts:a}},K=(e,t=`blank`,n)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:`status`,"aria-live":`polite`},message:e,pauseDuration:0,...n,id:n?.id||re()}),q=e=>(t,n)=>{let r=K(t,e,n);return U(r.toasterId||H(r.id))({type:2,toast:r}),r.id},J=(e,t)=>q(`blank`)(e,t);J.error=q(`error`),J.success=q(`success`),J.loading=q(`loading`),J.custom=q(`custom`),J.dismiss=(e,t)=>{let n={type:3,toastId:e};t?U(t)(n):V(n)},J.dismissAll=e=>J.dismiss(void 0,e),J.remove=(e,t)=>{let n={type:4,toastId:e};t?U(t)(n):V(n)},J.removeAll=e=>J.remove(void 0,e),J.promise=(e,t,n)=>{let r=J.loading(t.loading,{...n,...n?.loading});return typeof e==`function`&&(e=e()),e.then(e=>{let i=t.success?N(t.success,e):void 0;return i?J.success(i,{id:r,...n,...n?.success}):J.dismiss(r),e}).catch(e=>{let i=t.error?N(t.error,e):void 0;i?J.error(i,{id:r,...n,...n?.error}):J.dismiss(r)}),e};var Y=1e3,X=(e,t=`default`)=>{let{toasts:n,pausedAt:r}=G(e,t),i=(0,h.useRef)(new Map).current,a=(0,h.useCallback)((e,t=Y)=>{if(i.has(e))return;let n=setTimeout(()=>{i.delete(e),o({type:4,toastId:e})},t);i.set(e,n)},[]);(0,h.useEffect)(()=>{if(r)return;let e=Date.now(),i=n.map(n=>{if(n.duration===1/0)return;let r=(n.duration||0)+n.pauseDuration-(e-n.createdAt);if(r<0){n.visible&&J.dismiss(n.id);return}return setTimeout(()=>J.dismiss(n.id,t),r)});return()=>{i.forEach(e=>e&&clearTimeout(e))}},[n,r,t]);let o=(0,h.useCallback)(U(t),[t]),s=(0,h.useCallback)(()=>{o({type:5,time:Date.now()})},[o]),c=(0,h.useCallback)((e,t)=>{o({type:1,toast:{id:e,height:t}})},[o]),l=(0,h.useCallback)(()=>{r&&o({type:6,time:Date.now()})},[r,o]),u=(0,h.useCallback)((e,t)=>{let{reverseOrder:r=!1,gutter:i=8,defaultPosition:a}=t||{},o=n.filter(t=>(t.position||a)===(e.position||a)&&t.height),s=o.findIndex(t=>t.id===e.id),c=o.filter((e,t)=>t<s&&e.visible).length;return o.filter(e=>e.visible).slice(...r?[c+1]:[0,c]).reduce((e,t)=>e+(t.height||0)+i,0)},[n]);return(0,h.useEffect)(()=>{n.forEach(e=>{if(e.dismissed)a(e.id,e.removeDelay);else{let t=i.get(e.id);t&&(clearTimeout(t),i.delete(e.id))}})},[n,a]),{toasts:n,handlers:{updateHeight:c,startPause:s,endPause:l,calculateOffset:u}}},ae=k`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,oe=k`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,se=k`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,ce=j(`div`)`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||`#ff4b4b`};
  position: relative;
  transform: rotate(45deg);

  animation: ${ae} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${oe} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||`#fff`};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${se} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,le=k`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,ue=j(`div`)`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||`#e0e0e0`};
  border-right-color: ${e=>e.primary||`#616161`};
  animation: ${le} 1s linear infinite;
`,de=k`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,fe=k`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,pe=j(`div`)`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||`#61d345`};
  position: relative;
  transform: rotate(45deg);

  animation: ${de} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${fe} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||`#fff`};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,me=j(`div`)`
  position: absolute;
`,he=j(`div`)`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,ge=k`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,_e=j(`div`)`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${ge} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,ve=({toast:e})=>{let{icon:t,type:n,iconTheme:r}=e;return t===void 0?n===`blank`?null:h.createElement(he,null,h.createElement(ue,{...r}),n!==`loading`&&h.createElement(me,null,n===`error`?h.createElement(ce,{...r}):h.createElement(pe,{...r}))):typeof t==`string`?h.createElement(_e,null,t):t},ye=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,be=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,xe=`0%{opacity:0;} 100%{opacity:1;}`,Se=`0%{opacity:1;} 100%{opacity:0;}`,Ce=j(`div`)`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,we=j(`div`)`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Te=(e,t)=>{let n=e.includes(`top`)?1:-1,[r,i]=P()?[xe,Se]:[ye(n),be(n)];return{animation:t?`${k(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${k(i)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},Ee=h.memo(({toast:e,position:t,style:n,children:r})=>{let i=e.height?Te(e.position||t||`top-center`,e.visible):{opacity:0},a=h.createElement(ve,{toast:e}),o=h.createElement(we,{...e.ariaProps},N(e.message,e));return h.createElement(Ce,{className:e.className,style:{...i,...n,...e.style}},typeof r==`function`?r({icon:a,message:o}):h.createElement(h.Fragment,null,a,o))});A(h.createElement);var De=({id:e,className:t,style:n,onHeightUpdate:r,children:i})=>{let a=h.useCallback(t=>{if(t){let n=()=>{let n=t.getBoundingClientRect().height;r(e,n)};n(),new MutationObserver(n).observe(t,{subtree:!0,childList:!0,characterData:!0})}},[e,r]);return h.createElement(`div`,{ref:a,className:t,style:n},i)},Oe=(e,t)=>{let n=e.includes(`top`),r=n?{top:0}:{bottom:0},i=e.includes(`center`)?{justifyContent:`center`}:e.includes(`right`)?{justifyContent:`flex-end`}:{};return{left:0,right:0,display:`flex`,position:`absolute`,transition:P()?void 0:`all 230ms cubic-bezier(.21,1.02,.73,1)`,transform:`translateY(${t*(n?1:-1)}px)`,...r,...i}},ke=T`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,Z=16,Ae=({reverseOrder:e,position:t=`top-center`,toastOptions:n,gutter:r,children:i,toasterId:a,containerStyle:o,containerClassName:s})=>{let{toasts:c,handlers:l}=X(n,a);return h.createElement(`div`,{"data-rht-toaster":a||``,style:{position:`fixed`,zIndex:9999,top:Z,left:Z,right:Z,bottom:Z,pointerEvents:`none`,...o},className:s,onMouseEnter:l.startPause,onMouseLeave:l.endPause},c.map(n=>{let a=n.position||t,o=Oe(a,l.calculateOffset(n,{reverseOrder:e,gutter:r,defaultPosition:t}));return h.createElement(De,{id:n.id,key:n.id,onHeightUpdate:l.updateHeight,className:n.visible?ke:``,style:o},n.type===`custom`?N(n.message,n):i?i(n):h.createElement(Ee,{toast:n,position:a}))}))},je=J,Q=u(`loader-circle`,[[`path`,{d:`M21 12a9 9 0 1 1-6.219-8.56`,key:`13zald`}]]),$=o(),Me={primary:`bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500`,secondary:`bg-canvas text-ink border border-border hover:bg-border`,danger:`bg-danger text-white hover:bg-red-700 focus-visible:ring-red-400`,ghost:`text-ink-soft hover:bg-canvas`},Ne={sm:`px-3 py-1.5 text-xs`,md:`px-4 py-2 text-sm`,lg:`px-6 py-2.5 text-sm`},Pe=({children:e,variant:t=`primary`,size:n=`md`,loading:r=!1,disabled:i=!1,className:a=``,...o})=>(0,$.jsxs)(`button`,{disabled:i||r,className:`
      inline-flex items-center justify-center gap-2 font-medium rounded-lg
      transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      ${Me[t]} ${Ne[n]} ${a}
    `,...o,children:[r&&(0,$.jsx)(Q,{size:14,className:`animate-spin`}),e]});export{g as a,je as i,Q as n,f as o,Ae as r,Pe as t};