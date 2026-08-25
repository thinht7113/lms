import {check} from 'k6';

export function assertResponse(res,expectedStatus=200,logName = ''){
  const isOk = check(res,{[`${logName} status is ${expectedStatus}`]: (r) => r.status === expectedStatus,});
  if(!isOk){
    console.error(`[${logName}] Yêu cầu lỗi với trạng thái ${res.status}. Response:${res.body}`);
  }
  return isOk;
}

export function getRandomInt(min,max){
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function getRandomItem(array){
  return array[Math.floor(Math.random()*array.length)];
}