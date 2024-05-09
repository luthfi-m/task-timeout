import { sleep, check } from 'k6';
import http from 'k6/http';

export const options = {
  vus: 50,
  duration: '10s'
};

export default () => {
  const res = http.get('http://localhost:3000/worker');
  check(res, {
    'status is 200': () => res.status === 200,
  });
  
  sleep(1);
};