# OPIC — Open Integrated Cosmos（개방형 통합 우주）

<div align="center">
  <img src="public/LOGO/logolwBG.svg" alt="OPIC Logo" width="300">
</div>

**웹 기반 다중 스케일 우주 시각화 및 천문 데이터 통합 시스템**

> **참고**：이 프로젝트는 이전에 CXIC (CXIN Integrated Cosmos)로 알려져 있었습니다. 자세한 내용은 [이름 변경 공지](docs/NAME_CHANGE_ANNOUNCEMENT.md)를 참조하세요。

[English](./README_EN.md) | [中文](./README.md) | [日本語](./README_JA.md) | [Français](./README_FR.md) | [Deutsch](./README_DE.md) | [Español](./README_ES.md) | [Русский](./README_RU.md)

---

## 프로젝트 소개

OPIC는 Three.js, Cesium, Next.js로 구축된 인터랙티브 우주 시각화 애플리케이션입니다. 실제 천문 데이터와 정밀한 궤도 계산을 통해 지구 표면에서 관측 가능한 우주의 가장자리까지 동적 시뮬레이션을 제공합니다。

프로젝트는 모듈식 플러그인 아키텍처(MOD Manager)로 진화하고 있으며, 애플리케이션을 재시작하지 않고도 런타임에 기능을 독립적으로 로드, 구성 및 전환할 수 있습니다。

### 데모

<div align="center">
  <img src="docs/images/earth-to-universe-zoom.gif" alt="지구에서 우주로 줌 데모" width="300">
  <p><em>지구 표면 건물에서 우주 파노라마까지 매끄러운 줌 경험</em></p>
</div>

## 주요 기능

### 지구 시각화（Cesium 통합）

- 고정밀 타일 지구：Cesium 기반 글로벌 지형 및 이미지 타일 렌더링
- 다중 지도 소스 전환：Bing Maps, OpenStreetMap, ArcGIS, 천지도 등
- 실제 지구 지형 고도 데이터
- 거리 적응형：근거리에서는 Cesium 타일, 원거리에서는 Three.js 구체로 전환, 부드러운 전환
- Three.js와 Cesium 카메라 상태 실시간 동기화

### 태양계 시뮬레이션

- 고정밀 천체력 시스템：NASA JPL DE440 천체력 데이터 기반
- 27개 천체：8개 행성 + 19개 주요 위성의 정밀한 위치 계산
- 시간 제어：2009-2109년 고정밀 시간 범위, 빨리 감기 및 되감기 지원
- 동적 데이터 소스：고정밀 천체력 ↔ 해석 모델 자동 전환

### 인공위성 추적

- 실시간 추적：CelesTrak TLE 데이터 및 SGP4 궤도 모델 기반
- 위성 검색：궤도상 인공위성 탐색 및 검색
- 궤도 시각화：위성 궤도 경로 및 운동 궤적 표시
- 상세 정보：위성 매개변수, 궤도 요소 및 상태 표시

<div align="center">
  <img src="docs/images/satellite-tracking-demo.gif" alt="위성 추적 데모" width="300">
  <p><em>실시간 위성 궤도 추적 및 정보 표시</em></p>
</div>

### 다중 스케일 우주 시각화

줌 뷰를 통해 9개의 우주 스케일 계층 탐색：

| 스케일 | 거리 범위 | 데이터 소스 |
|-------|---------|-----------|
| 지구 | 0 - 100,000 km | Cesium 타일 |
| 태양계 | 0.1 - 100 AU | NASA JPL DE440 |
| 근처 항성 | 0 - 100 광년 | ESA Gaia DR3 |
| 은하수 | 100 - 50,000 광년 | ESA Gaia |
| 국부 은하군 | 50k - 1M 광년 | McConnachie 2012 |
| 근처 은하군 | 1M - 10M 광년 | Karachentsev 2013 |
| 처녀자리 초은하단 | 10M - 50M 광년 | 2MRS Survey |
| 라니아케아 초은하단 | 50M - 500M 광년 | Cosmicflows-3 |
| 관측 가능한 우주 | 500M+ 광년 | 우주 웹 구조 |

### MOD 관리자 시스템（개발 중）

모듈식 플러그인 아키텍처로 코어 시스템을 경량으로 유지하면서 선택적 기능을 런타임에 동적으로 로드：

- 시맨틱 버전 관리를 지원하는 선언적 MOD 매니페스트
- 완전한 라이프사이클 관리：registered → loaded → enabled → disabled → unloaded
- 순환 종속성 감지를 포함한 자동 종속성 해결
- 버전 관리 API 레이어：Time, Camera, Celestial, Satellite, Render API
- 오류 격리 — MOD 장애가 코어 시스템에 영향을 미치지 않음
- 세션 간 구성 지속성

<div align="center">
  <img src="docs/images/mod-manager-interface.gif" alt="MOD 관리자 인터페이스" width="300">
  <p><em>MOD 관리자 인터페이스 및 예제 모듈 표시</em></p>
</div>

### 시각적 기능

- 고품질 행성 텍스처（Solar System Scope）
- ESA Gaia 데이터 기반 항성 렌더링
- 인터랙티브 카메라：자유 회전, 줌 및 천체 포커스
- 스케일 간 매끄러운 시각적 전환
- 거리에 따라 동적으로 조정되는 4단계 세부 수준

## 기술 스택

| 카테고리 | 기술 |
|---------|------|
| 프론트엔드 프레임워크 | Next.js 16 / React 19 |
| 3D 렌더링 | Three.js 0.170 + Cesium 1.139 |
| 언어 | TypeScript 5 |
| 스타일링 | Tailwind CSS 4 |
| 상태 관리 | Zustand 5 |
| 궤도 계산 | satellite.js (SGP4) |
| 데이터 압축 | pako (gzip) |
| 테스트 | Jest + fast-check |

## 빠른 시작

### 환경 요구사항

- Node.js 20+
- npm 또는 yarn

### 설치

```bash
# 저장소 복제
git clone https://github.com/ChenXin-2009/OPIC.git
cd OPIC

# 종속성 설치
npm install

# 개발 서버 시작
npm run dev
```

`http://localhost:3000`에 접속하여 애플리케이션을 확인하세요。

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 조작 가이드

| 조작 | 기능 |
|-----|------|
| 마우스 드래그 | 시점 회전 |
| 스크롤 휠 | 뷰 줌（다양한 우주 스케일 탐색） |
| 행성/위성 클릭 | 대상에 포커스 |
| 시간 제어 | 시뮬레이션 속도 및 날짜 조정 |
| 지도 전환 | 지구 뷰에서 다른 이미지 소스 전환 |
| 지구 잠금 | 카메라를 지구 중심에 잠금 |

## 데이터 소스

### 천체력 데이터

| 천체 | 데이터 소스 | 시간 범위 | 정확도 |
|-----|-----------|---------|--------|
| 지구, 화성, 달 | NASA JPL DE440 | 2009-2109 | <0.1° |
| 기타 행성 | NASA JPL DE440 | 2009-2039 | <0.1° |
| 목성 위성 | NASA JPL JUP365 | 2009-2039 | <0.01° |
| 토성 위성 | NASA JPL SAT441 | 2009-2039 | <0.01° |
| 해왕성 위성 | NASA JPL NEP097 | 2009-2039 | <0.01° |

### 우주 데이터

- 항성 데이터：ESA Gaia Mission (DR3)
- 국부 은하군：McConnachie (2012) Local Group Catalog
- 근처 은하군：Karachentsev et al. (2013)
- 처녀자리 초은하단：2MRS Survey Data
- 라니아케아 초은하단：Cosmicflows-3 Dataset

### 위성 데이터

- TLE 궤도 데이터：CelesTrak (NORAD)
- 위성 메타데이터：UCS (Union of Concerned Scientists) 위성 데이터베이스

### 시각적 리소스

- 행성 텍스처：Solar System Scope
- 은하수 이미지：ESA/Gaia

## 프로젝트 구조

```
opic/
├── src/
│   ├── app/                    # Next.js 앱 라우터
│   ├── components/             # React 컴포넌트
│   │   ├── canvas/            # 3D 캔버스 컴포넌트
│   │   ├── cesium/            # Cesium 관련 컴포넌트
│   │   ├── satellite/         # 위성 추적 UI
│   │   ├── mod-manager/       # MOD 관리자 UI（개발 중）
│   │   └── ...
│   ├── lib/
│   │   ├── 3d/                # Three.js 렌더러
│   │   │   ├── SceneManager.ts
│   │   │   ├── Planet.ts
│   │   │   ├── GalaxyRenderer.ts
│   │   │   ├── LocalGroupRenderer.ts
│   │   │   ├── VirgoSuperclusterRenderer.ts
│   │   │   ├── LaniakeaSuperclusterRenderer.ts
│   │   │   ├── LODManager.ts
│   │   │   └── ...
│   │   ├── cesium/            # Cesium 통합
│   │   │   ├── CesiumAdapter.ts
│   │   │   ├── CameraSynchronizer.ts
│   │   │   └── ...
│   │   ├── astronomy/         # 천문 계산
│   │   ├── satellite/         # 위성 추적（SGP4）
│   │   ├── mod-manager/       # MOD 관리자 코어（개발 중）
│   │   │   ├── core/          # 레지스트리, 라이프사이클, 종속성 해결
│   │   │   ├── api/           # Time/Camera/Celestial/Satellite/Render API
│   │   │   ├── persistence/   # 구성 지속성
│   │   │   ├── error/         # 오류 처리 및 격리
│   │   │   └── performance/   # 성능 모니터링
│   │   ├── config/            # 구성 파일
│   │   ├── data/              # 데이터 로더
│   │   └── types/             # TypeScript 타입
│   └── stores/                # Zustand 상태 관리
├── public/
│   ├── data/                  # 천문 데이터
│   │   ├── ephemeris/        # NASA JPL 천체력 데이터
│   │   ├── gaia/             # Gaia 항성 데이터
│   │   └── universe/         # 우주 구조 데이터
│   ├── textures/              # 텍스처 리소스
│   └── cesium/                # Cesium 정적 자산
├── scripts/                   # 데이터 생성 스크립트
└── docs/                      # 프로젝트 문서
```

## 개발

```bash
# 테스트 실행
npm test

# 코드 검사
npm run lint
npm run lint:fix

# 타입 체크
npm run quality:check

# 테스트 커버리지
npm run test:coverage
```

## 성능 최적화

- 거리에 따라 동적으로 조정되는 4단계 LOD 시스템
- 온디맨드 지구 타일 로드, 원거리 타일 자동 제거
- 근거리 Cesium 타일, 원거리 Three.js 구체
- 수백만 개의 파티클을 지원하는 커스텀 셰이더 파티클 시스템
- 인스턴스화 렌더링으로 드로우 콜 감소
- 뷰 프러스텀 컬링, 가시 객체만 렌더링
- 원거리 리소스 자동 해제
- 논블로킹 데이터 처리를 위한 Web Workers

## 면책 조항

이 애플리케이션은 교육 및 오락 목적으로만 사용됩니다。

**천문 데이터 정확도 설명：**

고정밀 시간 범위 내（2009-2109년 지구/화성/달, 2009-2039년 기타 천체）에서는 NASA JPL 천체력 데이터를 사용하며, 정확도는 각초 수준에 도달합니다。이 범위를 초과하면 시스템이 자동으로 해석 모델로 전환되어 정확도가 감소합니다。

과학 연구 또는 내비게이션에 정확한 천문 데이터가 필요한 경우 NASA JPL HORIZONS 시스템 또는 기타 전문 천문 기관의 공식 자료를 참조하십시오。

**위성 궤도 데이터 설명：**

인공위성 궤도 데이터는 TLE（Two-Line Element）및 SGP4 모델을 기반으로 계산되며, 정확도는 대기 저항, 태양 복사압 등의 요인에 영향을 받으므로 참고용입니다。

**책임 성명：**

이 소프트웨어는 "있는 그대로" 제공되며, 명시적 또는 묵시적 보증이 없습니다。어떠한 경우에도 저자 또는 저작권 보유자는 어떠한 청구, 손해 또는 기타 책임에 대해 책임을 지지 않습니다。

이 소프트웨어는 페일세이프 성능이 필요한 환경에는 적합하지 않습니다。사용자는 고위험 활동에서 이 소프트웨어를 사용함으로써 발생하는 손실 또는 손해에 대해 저자가 책임을 지지 않는다는 것을 명시적으로 이해하고 동의합니다。

## 기여 가이드

모든 형태의 기여를 환영합니다！우리는 인간 개발자와 AI 어시스턴트의 협력을 환영합니다。

- 참여 방법은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요
- 버그 보고 또는 새로운 기능 제안을 위해 Issue를 제출하세요
- 코드 기여를 위해 Pull Request를 제출하세요
- **AI 기여 환영**：AI 도구 및 에이전트를 사용한 기여를 장려합니다

## 라이선스

이 프로젝트는 Apache License 2.0 라이선스를 채택합니다。

주요 특징：
- 상업적 사용, 수정 및 배포 허용
- 저작권 및 라이선스 성명 보존 필요
- 명확한 특허 라이선스 제공
- 면책 조항 및 책임 제한 포함

자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요。

## 연락처

- **GitHub**: [@ChenXin-2009](https://github.com/ChenXin-2009)
- **프로젝트 주소**: [https://github.com/ChenXin-2009/OPIC](https://github.com/ChenXin-2009/OPIC)
- **웹사이트**: [https://opic.cxin.tech](https://opic.cxin.tech)
