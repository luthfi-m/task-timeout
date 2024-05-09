function randomIntFromInterval(min:number, max: number) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export function sendMessage(){
  return new Promise<void>((resolve) => {
    // const delay = randomIntFromInterval(1, 10);
    setTimeout(() => resolve(), 600);

    // let sum = 0;
    // for (let i = 0; i < delay * 10000000; i++) {
    //   if (i % 2 === 0) {
    //     sum += i;
    //   }
    // }
    // console.log(sum);
    // resolve(sum);
  });
}

export async function cleanUp() {
  console.log('cleaning up..');
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
}
