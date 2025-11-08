/** @jsxImportSource auwla */
import { definePage } from '../../../src/meta/definePage'
import { fullstackPlugin } from '../../../src/meta/plugins/fullstack'
import { $api } from '../../server/app-hono'
import { h, watch, If ,ref} from "../../../src/index"



// Simple page that loads a user by id from query (?id=123)
export const UserPage = definePage({
  context: async ({ $api, query}) => {
    const id = String(query.id ?? '1')
    return $api.getUser({ id })
  },
  component: (_ctx, { data, loading, error }) => {
      const counter = ref(0)

      return (
        <section>
          <h2>User</h2>
          {If(()=>loading.value,()=><p>loading</p>)}
          {If(()=> error.value,(value)=> <p>error: {value.message}</p>)}
          {If(()=> data.value,(value)=> <p>user: {value.name}</p>)}
          <button onClick={()=>counter.value++}>click me {counter}</button>
        </section>
      )

  },
  meta: { title: 'User Page' },
}, [fullstackPlugin($api)])