import {h, When,asyncOp,ref,watch,For,onUnmount} from "../../index"



export interface ImageSearchResponse {
  page: number;
  per_page: number;
  photos: Photo[];
  total_results: number;
  next_page: string;
}

export interface Photo {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: Src;
  liked: boolean;
  alt: string;
}

export interface Src {
  original: string;
  large2x: string;
  large: string;
  medium: string;
  small: string;
  portrait: string;
  landscape: string;
  tiny: string;
}

const API_URL = `https://api.pexels.com/v1/search?per_page=30&query=`;

// Get an API key at: https://www.pexels.com/api/
const authorization = 'sKbofvHmytF7iE3m5AkZvT1bNipNvArTnuit6ztm5nfUfDUxKysKNN5u';

export default async function getImages(searchTerm: string) {
  if (!searchTerm) return [];

  const response = await fetch(`${API_URL}${searchTerm}`, {
    headers: {
      authorization,
    },
  });
  const json = await response.json() as ImageSearchResponse;
  await new Promise((resolve) => setTimeout(resolve, 500));
  return json.photos;
}

export function App(){
  const {loading,error,refetch:submitForm,data} = asyncOp(async (searchTerm: string)=>getImages(searchTerm))
 
   function handleSubmit(event:Event){
      event.preventDefault()
      const formEvent = event.currentTarget as HTMLFormElement
      const formData = new FormData(formEvent)
      const searchTerm = formData.get('searchTerm') as string;
      submitForm(searchTerm)
   }

   watch(data,(v)=>{
    console.log(v)
   })

  return (
    <div class="w-4/5 mx-auto mt-8">
      <h1 class="text-3xl font-bold mb-6">Auwla Image Search</h1>

      <form onSubmit={handleSubmit} class="mb-8">
         <label class="block mb-4">
          <span class="text-gray-700 mb-2 block">Search</span>
          <input 
            placeholder="search for image"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="text"
            id="searchTerm"
            name="searchTerm"
          />
        </label>
        <button 
          type="submit"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {watch(loading,(l)=> l? "loading":"search")}
        </button>
      </form>

       <When>
        {loading}
        {() => (
          <div class="text-center py-8">
            <img
              alt="loading"
              id="loadingImage"
              class="w-full max-w-md mx-auto rounded-lg"
              src="https://i.imgur.com/LVHmLnb.gif"
            />
            <p class="mt-4 text-gray-600">loading</p>
          </div>
        )}
        
        {watch(error, (err) => err !== null)}
        {() => (
          <p class="text-red-600 text-center py-4">An error occured: {error.value || ""}</p>
        )}

        {() => (
          <section class="columns-1 md:columns-2 xl:columns-3 gap-2">
            <For each={watch(data, (d) => (d || []) as Photo[])}>{(photo) => <ImageLoader photo={photo} />}</For>
          </section>
        )}
       </When>
    </div>
  )
}




export  function ImageLoader({ photo }: { photo: Photo }) {
  const imgSrc = ref("");

  const loadImage = () => {
    const img = new Image();
    img.onload = () => {
      imgSrc.value= photo.src.large;
    };
    img.src = photo.src.large;
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        imgSrc.value = photo.src.small
        loadImage();
        observer.unobserve(entry.target);
      }
    });
  });

  onUnmount(() => {
    observer.disconnect();
  });

  return (
    <img
      ref={(element) => observer.observe(element)}
      class="w-full rounded-lg bg-gray-400 my-1 block"
      style={{aspectRatio: String(photo.width / photo.height)}}
      src={imgSrc}
      alt={photo.alt}
    />
  );
}