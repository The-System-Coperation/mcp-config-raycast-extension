# MCP Manager

MCP Manager는 AI 개발을 위한 MCP 파일 관리 도구입니다. Cursor와 Claude에서 사용할 수 있는 MCP 설정을 쉽게 생성하고 관리할 수 있습니다.

## 주요 기능

### 1. MCP 파일 관리

- 새로운 MCP JSON 파일 생성
- 기존 MCP 파일 수정 및 관리
- Desktop의 `mcp` 폴더에 파일 자동 저장

### 2. 템플릿 시스템

- 자주 사용하는 MCP 설정을 템플릿으로 저장
- 여러 MCP 파일을 하나의 템플릿으로 통합
- 템플릿을 기반으로 새로운 MCP 파일 생성

### 3. AI 도구 통합

- Cursor MCP 설정 적용
- Claude MCP 설정 적용
- `.cursor/mcp.json` 파일 자동 업데이트

## 사용 방법

### 새 MCP 파일 생성

1. `⌘ + N` 단축키 또는 "새 Mcp 파일 생성" 버튼 클릭
2. 파일 이름과 JSON 내용 입력
3. 저장 버튼 클릭

### 새 JSON 파일 생성

1. `⌘ + Shift + N` 단축키 또는 "새 JSON 파일 생성" 버튼 클릭
2. 기본 MCP 서버 설정이 포함된 폼에서 내용 수정
3. 저장 버튼 클릭

### 템플릿 저장

1. 하나 이상의 MCP 파일 선택
2. "템플릿으로 저장" 액션 선택
3. 템플릿 이름 입력
4. 저장 버튼 클릭

### Cursor/Claude MCP 적용

1. 적용할 MCP 파일 선택
2. "Cursor Mcp에 적용" 또는 "Claude Mcp에 적용" 액션 선택
3. 설정이 자동으로 적용됨

## 설치 방법

1. Raycast Store에서 "MCP Manager" 검색
2. 설치 버튼 클릭
3. Raycast에서 `⌘ + Space`를 눌러 "MCP Manager" 실행

## 요구사항

- macOS
- Raycast
- Cursor 또는 Claude (선택사항)

## 라이선스

MIT License

## 기여하기

1. 이 저장소를 포크
2. 새로운 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 작성자

- yeeed711
