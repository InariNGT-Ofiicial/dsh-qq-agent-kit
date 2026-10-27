import {scopeOf} from '@deepseek-ai/dsh-scope';
import fs from 'node:fs';
import path from 'node:path';
export const name = 'qq-lab-no-tools';
export const inject = ['tools'];
export function apply(ctx) {
  ctx.tools.restrict({allow: []});
  ctx.tools.guard(() => 'QQ lab has no tool execution permission');
  const scope=scopeOf(ctx);
  if(!scope)throw new Error('Missing agent/preset scope');
  const count=ctx.tools.schemas(scope).length;
  if(count!==0)throw new Error('Restricted preset still exposes tools');
  fs.writeFileSync(path.join(process.env.DSH_HOME,'no-tools-proof.json'),JSON.stringify({at:new Date().toISOString(),visibleTools:count,guardInstalled:true}));
}
