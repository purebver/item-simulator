# item-simulator

### 0. DB_Diagram

![스크린샷 2024-09-10 224437](https://github.com/user-attachments/assets/ab0f1e84-01ac-4168-bde2-932d39ca5133)

---

### 1. 프로젝트 구성

---

1. src/

- app: 메인서버 실행 파일

---

2. src/middlewares/

- auth.middleware: 토큰 인증 관리
- error-handling.middleware: 예상치못한 에러, 여러군대에서 발생 할 만한 에러 통합 처리
- log.middleware: 응답 완료 후 기록을 콘솔에 표시

---

3. src/routes/

- character: 캐릭터 생성, 삭제, 조회
- equipment: 장비의 탈부착, 특정 캐릭터의 장비 조회
- inventory: 특정 캐릭터의 인벤토리 조회
- item: 아이템 조회, 생성, 수정
- scarecrow: 특정 캐릭터 money 충전
- store: 상점 아이템 조회, 구입, 판매
- users: 회원가입, 로그인(토큰 발급)

---

4. src/utils/prisma

- index: prisma 작동 시 콘솔에 찍힐 로그를 설정

---

### 2. 프로젝트 사용법

---

1. character: 캐릭터 생성, 삭제, 조회

- 캐릭터 생성: /api/character/create

  Authorization 헤더 토큰 필요

  - body 필수요소: name

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

---

2. equipment: 장비의 탈부착, 특정 캐릭터의 장비 조회

- 장비 장착: /api/equipment/:characterId

  Authorization 헤더 토큰 필요

  - body 필수요소: 아이템이 있는 slotNumber

    JSON{

    "slotNumber": 1

    }

    => "message": "가죽투구을(를) 장착 하였습니다."

- 장비 탈착: /api/equipment/unequip/:characterId

  Authorization 헤더 토큰 필요

  - body 필수요소: 장착 부위를 나타내는 equipment의 field(arms, body, head, shoes, weapon)의 값 null

  - 하나씩만 탈착 가능

    JSON{

    "head": null

    }

    => "message": "가죽투구을(를) 해제 하였습니다."

- 장비 조회: /api/equipment/:characterId

  => 캐릭터가 장착중인 아이템 정보가 body에 전달됨

---

3. inventory: 특정 캐릭터의 인벤토리 조회

- 인벤토리 조회: /api/inventory/:characterId

  Authorization 헤더 토큰 필요

  => 캐릭터의 inventorySlot데이터가 body에 전달됨

---

4. item: 아이템 조회, 생성, 수정

- 아이템 조회: /api/item

  => 응답 body에 아이템 목록

- 아이템 생성: /api/item/create

  - body 필수요소: name, itemtype, baseState

  - itemtype은 장착 부위를 나타내는 equipment의 field(arms, body, head, shoes, weapon)

  - price는 안적을 경우 0

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

  - body 필수요소: 아이템 생성과 동일

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

---

5. scarecrow: 특정 캐릭터 money 충전

- 캐릭터 money 충전: /api/scarecrow/:characterId

  => 그냥 100씩 충전됨

---

6. store: 상점 아이템 조회, 구입, 판매

- 상점 조회: /api/store

  => 응답 body에 아이템 목록

- 아이템 부위별 조회: /api/store/타입

  - 타입: arms, body, head, shoes, weapon

    => 응답 body에 그 타입 아이템 목록

- 구입: /api/store/purchase/:characterId

  Authorization 헤더 토큰 필요

  - body 필수요소: itemId, quantity

    JSON{

    "itemId": 1,

    "quantity": 1

    }

    => "message": "item 가죽투구이(가) 1개 구입되었습니다."

- 판매: /api/store/sell/:characterId

  Authorization 헤더 토큰 필요

  - body 필수요소: itemId, quantity

    JSON{

    "itemId": 1,

    "quantity": 1

    }

    =>"message": "item 가죽투구을(를) 1개 판매하여 돈1200을 받았습니다"

---

7. users: 회원가입, 로그인(토큰 발급)

- 회원가입: /api/sign-up

  - body 필수요소: name, email, id, password, check

  - password와 check는 같아야 하며 소문자와 숫자만 조합 가능

    JSON{

    "name": "테스트1",

    "email": "test1@gmail.com",

    "id": "sparta1",

    "password": "aaaa4321",

    "check": "aaaa4321"

    }

- 로그인: /api/sign-in

  - body 필수요소: id, password

    JSON{

    "id": "sparta1",

    "password": "aaaa4321",

    }

    => 토큰이 body에 전달됨

---

### 3. 그외

- DB관계는 prisma/schema.prisma파일을 참조

- items테이블에는 기본 14개의 데이터가 있음 itemId:1 ~ 14
