import {Remote,TypertRemoteService} from '@deepseek-ai/dsh-typert-protocol';
import {PersonaStore} from './persona.mjs';
const initializers=[];
export class QqPersonaService extends TypertRemoteService{
 constructor(ctx,workspaces){super(ctx,'qqPersona');for(const init of initializers)init.call(this);this.store=new PersonaStore(workspaces);}
 async list(){return this.store.list();}
 async read(id){return this.store.read(id);}
 async preview(id,instructions,persona){return this.store.preview(id,instructions,persona);}
 async save(id,instructions,persona,revision,digest){return this.store.save(id,instructions,persona,revision,digest);}
}
// Apply the package's standard decorator initializers without a transpilation step.
for(const name of ['list','read','preview','save'])Remote(QqPersonaService.prototype[name],{kind:'method',name,static:false,private:false,addInitializer:fn=>initializers.push(fn)});
