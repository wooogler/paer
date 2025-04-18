# MongoDB 마이그레이션 및 다중 사용자 지원 요약

## 변경 사항

1. **MongoDB 연결 설정**
   - `server/src/config/database.ts` 파일 생성
   - mongoose를 사용한 데이터베이스 연결 설정

2. **모델 정의**
   - `server/src/models/User.ts` - 사용자 모델
   - `server/src/models/Paper.ts` - 문서 모델
   - `server/src/models/Chat.ts` - 채팅 모델

3. **Repository 클래스 업데이트**
   - `PaperRepository`: 파일 기반 저장에서 MongoDB 기반으로 변경
   - `ChatRepository`: 파일 기반 저장에서 MongoDB 기반으로 변경
   - 모든 메서드가 userId와 paperId를 받도록 변경

4. **Service 클래스 업데이트**
   - `PaperService`: 다중 사용자 지원 메서드 추가
   - `ChatService`: 다중 사용자 지원 메서드 추가
   - `UserService`: 새로 추가됨

5. **Controller 클래스 업데이트**
   - `PaperController`: 다중 사용자 지원 메서드 추가
   - `ChatController`: 다중 사용자 지원 메서드 추가
   - `UserController`: 새로 추가됨

6. **라우트 업데이트**
   - `papers.ts`: 경로에 사용자 ID 파라미터 추가
   - `chat.ts`: 경로에 문서 ID와 사용자 ID 파라미터 추가
   - `users.ts`: 새로 추가됨

7. **메인 애플리케이션 파일 업데이트**
   - MongoDB 연결 설정 추가
   - 사용자 라우트 등록

## 데이터 구조 변경

### 문서 모델
```typescript
{
  userId: ObjectId,         // 문서 소유자 ID
  title: String,            // 문서 제목
  content: Paper,           // 문서 내용 (기존 JSON 구조 유지)
  collaborators: [ObjectId] // 협업자 ID 배열
}
```

### 채팅 모델
```typescript
{
  userId: ObjectId,       // 사용자 ID
  paperId: ObjectId,      // 문서 ID
  messages: [            // 메시지 배열
    {
      id: String,         // 메시지 ID
      role: String,       // 역할 (user/system/assistant)
      content: String,    // 메시지 내용
      timestamp: Number,  // 타임스탬프
      blockId: String     // 연결된 블록 ID
    }
  ]
}
```

### 사용자 모델
```typescript
{
  username: String,       // 사용자명 (고유)
  email: String,          // 이메일 (선택사항)
}
```

## 마이그레이션 방법

1. **환경 설정**
   - MongoDB 설치 또는 Atlas 계정 생성
   - `.env` 파일에 MongoDB 연결 문자열 추가:
     ```
     MONGODB_URI=mongodb://localhost:27017/paer
     ```

2. **기존 데이터 마이그레이션**
   - 기존 JSON 파일의 데이터를 MongoDB로 마이그레이션하는 스크립트 작성 필요
   - 초기 사용자 계정 생성 필요

3. **API 사용 방법 변경**
   - 모든 API 요청에 `userId` 파라미터 추가
   - 채팅 API에 `paperId` 파라미터 추가

## 다중 사용자 지원 기능

1. **사용자 관리**
   - 사용자 생성: `POST /api/users`
   - 사용자 조회: `GET /api/users/:id`
   - 사용자명으로 조회: `GET /api/users/username/:username`

2. **문서 관리**
   - 사용자별 문서 목록: `GET /api/papers?userId=:userId`
   - 문서 생성: `POST /api/papers` (body에 userId 포함)
   - 문서 협업자 추가: `POST /api/papers/:id/collaborators`

3. **채팅**
   - 문서별 채팅 메시지: `GET /api/chat/:paperId/messages?userId=:userId`
   - 채팅 메시지 추가: `POST /api/chat/:paperId/messages` (body에 userId 포함)

## 보안 고려사항

현재는 간단한 사용자 인증만 구현되어 있으므로, 향후 다음과 같은 보안 기능 추가가 필요합니다:

1. 토큰 기반 인증 (JWT)
2. 비밀번호 해싱 저장
3. 권한 관리
4. API 요청 제한

## 후속 작업

1. 클라이언트 UI 업데이트하여 다중 사용자 기능 지원
2. 사용자 인증 개선
3. 실시간 협업 기능 구현 (Socket.io/WebSocket) 