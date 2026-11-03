# docs

Pin it! 기획 문서 모음.

| 경로 | 내용 |
|---|---|
| [prd/](prd/) | PRD v1.0 (확정본) |
| [wireframe/PinIt_Wireframe_v1.1.pdf](wireframe/PinIt_Wireframe_v1.1.pdf) | 화면별 주석이 달린 PDF 와이어프레임 (Galaxy S26, 360×780dp) |
| [wireframe/html/](wireframe/html/) | 클릭되는 HTML 와이어프레임. `index.html`을 브라우저로 열면 전체 화면 목록이 나와요. 화면 1개 = `pages/` 파일 1개 |
| [wireframe/pdf-source/](wireframe/pdf-source/) | PDF 와이어프레임 원본. 고친 뒤 Chrome으로 PDF 다시 출력 |

PDF 다시 출력:

```sh
chrome --headless=new --no-pdf-header-footer --virtual-time-budget=15000 \
  --print-to-pdf=docs/wireframe/PinIt_Wireframe_v1.1.pdf docs/wireframe/pdf-source/wireframe.html
```
