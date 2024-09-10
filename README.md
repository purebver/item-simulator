# item-simulator

### 프로젝트 구성

1. /middlewares/

- auth.middleware: 토큰 인증 관리
- error-handling.middleware: 예상치못한 에러, 여러군대에서 발생 할 만한 에러 통합 처리
- log.middleware: 응답 완료 후 기록을 콘솔에 표시

2. /routes/

- character: 캐릭터 생성, 삭제, 조회
- equipment: 장비의 탈부착, 특정 캐릭터의 장비 조회
- inventory: 특정 캐릭터의 인벤토리 조회
- item: 아이템 조회, 생성, 수정
- scarecrow: 특정 캐릭터 money 충전
- store: 상점 아이템 조회, 구입, 판매
- users: 회원가입, 로그인(토큰 발급)

### 프로젝트 사용법

1. character: 캐릭터 생성, 삭제, 조회

> - 캐릭터 생성: /api/character/create

Authorization 헤더 토큰 필요

JSON{

"name": "sparta1"

}

=> "message": "ID:4 name:sparta1 캐릭터 생성이 완료되었습니다"

=> 캐릭터의 id가 전달됨

- 캐릭터 삭제: /api/character/delete/:characterId

  Authorization 헤더 토큰 필요

  => "message": "캐릭터가 삭제되었습니다."

- 캐릭터 조회: /api/character/check/:characterId

  => Authorization인증을 할 경우 추가 정보 제공

2. equipment: 장비의 탈부착, 특정 캐릭터의 장비 조회

- 장비 장착: /api/equipment/:characterId

  Authorization 헤더 토큰 필요

  JSON{

  "slotNumber": 1

  }

  => "message": "가죽투구을(를) 장착 하였습니다."

- 장비 탈착: /api/equipment/unequip/:characterId

  Authorization 헤더 토큰 필요

  JSON{

  "head": null

  }

  => "message": "가죽투구을(를) 해제 하였습니다."

- 장비 조회: /api/equipment/:characterId

  => 캐릭터가 장착중인 아이템 정보가 body에 전달됨

3. inventory: 특정 캐릭터의 인벤토리 조회

- 인벤토리 조회: /api/inventory/:characterId

  Authorization 헤더 토큰 필요

  => 캐릭터의 inventorySlot데이터가 body에 전달됨

4. item: 아이템 조회, 생성, 수정

- 아이템 조회: /api/item

  => 응답 body에 아이템 목록

- 아이템 생성: /api/item/create

  JSON{

  "name": "강철검",

  "information": "강도가 향상된 좋은 검 입니다.",

  "itemType": "weapon",

  "rarity": "Rare",

  "baseState": {

  "power": 150

  },

  "price": 10000

  }

- 아이템 수정: /api/item/renewal/:itemId

  JSON{

  "name": "천옷",

  "information": "평범한 천옷입니다.",

  "itemType": "body",

  "rarity": "Normal",

  "baseState": {

  "health": 50

  },

  "price": 2000

  }

  => price를 제외한 값을 수정

5. scarecrow: 특정 캐릭터 money 충전

- 캐릭터 money 충전: /api/scarecrow/:characterId

  => 그냥 100씩 충전됨

6. store: 상점 아이템 조회, 구입, 판매

- 상점 조회: /api/store

  => 응답 body에 아이템 목록

- 아이템 부위별 조회: /api/store/타입

  타입 = arms, body, head, shoes, weapon

  => 응답 body에 그 타입 아이템 목록

- 구입: /api/store/purchase/:characterId

  Authorization 헤더 토큰 필요

  JSON{

  "itemId": 1,

  "quantity": 1

  }

  => "message": "item 가죽투구이(가) 1개 구입되었습니다."

- 판매: /api/store/sell/:characterId

  Authorization 헤더 토큰 필요

  JSON{

  "itemId": 1,

  "quantity": 1

  }

  =>"message": "item 가죽투구을(를) 1개 판매하여 돈1200을 받았습니다"

7. users: 회원가입, 로그인(토큰 발급)

- 회원가입: /api/sign-up

  password와 check는 같아야 하며 소문자와 숫자만 조합 가능

  JSON{

  "name": "테스트1",

  "email": "test1@gmail.com",

  "id": "sparta1",

  "password": "aaaa4321",

  "check": "aaaa4321"

  }

- 로그인: /api/sign-in

  JSON{

  "id": "sparta1",

  "password": "aaaa4321",

  }

  => 토큰이 body에 전달됨
