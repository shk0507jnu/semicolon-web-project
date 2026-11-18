


import os
from datetime import date
from enum import Enum
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field, StrictInt


# ==========================================
# 1. 환경변수 및 모델 설정
# ==========================================

load_dotenv(Path(__file__).with_name('.env'), override=False)

MODEL_NAME = "gemini-3.5-flash-lite"


# ==========================================
# 2. 근무 종류
# ==========================================

class ShiftType(str, Enum):
    DAY = "DAY"
    EVENING = "EVENING"
    NIGHT = "NIGHT"


# ==========================================
# 3. 제약조건 종류
# ==========================================

class ConstraintType(str, Enum):
    LEAVE = "LEAVE"
    FORBIDDEN_SHIFT = "FORBIDDEN_SHIFT"
    PREFERRED_SHIFT = "PREFERRED_SHIFT"
    MAX_SHIFT = "MAX_SHIFT"
    MIN_SHIFT = "MIN_SHIFT"


# ==========================================
# 4. 제약조건 데이터 모델
# ==========================================

class Constraint(BaseModel):

    constraint_type: ConstraintType = Field(
        description="제약조건 종류"
    )

    employee_name: str = Field(
        description="직원 이름. 모르면 빈 문자열"
    )

    start_date: Optional[str] = Field(
        default=None,
        description="시작일 YYYY-MM-DD"
    )

    end_date: Optional[str] = Field(
        default=None,
        description="종료일 YYYY-MM-DD"
    )

    shift: Optional[ShiftType] = Field(
        default=None,
        description="DAY, EVENING, NIGHT"
    )

    value: Optional[StrictInt] = Field(
        default=None,
        description="최대 또는 최소 근무 횟수"
    )


# ==========================================
# 5. Gemini 파싱 결과 모델
# ==========================================

class ParsedCommand(BaseModel):

    constraints: List[Constraint] = Field(
        description="추출된 제약조건 목록"
    )

    need_clarification: bool = Field(
        description="추가 질문 필요 여부"
    )

    clarification_message: Optional[str] = Field(
        default=None,
        description="추가 정보가 필요할 때 질문"
    )


# ==========================================
# 6. 시스템 프롬프트
# ==========================================

SYSTEM_PROMPT = """
당신은 병원 교대근무 스케줄 관리 시스템의
자연어 제약조건 추출기입니다.

사용자가 입력한 한국어 문장을 분석하여
정해진 JSON 구조로 변환하세요.

[핵심 원칙]

1. 사용자가 명시한 정보만 추출합니다.
2. 직원 이름, 날짜, 근무 종류, 횟수를
   임의로 만들어내지 않습니다.
3. 여러 직원 또는 여러 요청이 등장하면
   각각 별도의 제약조건으로 분리합니다.
4. 하나의 제약조건에는 직원 이름 하나만 넣습니다.
5. 추가 정보가 필요하면
   need_clarification을 true로 설정합니다.
6. 정보가 부족한 제약조건은 추출 가능한
   필드만 유지하고 나머지는 null로 둡니다.
7. 추가 질문이 필요하면
   clarification_message에 구체적인 질문을 작성합니다.
8. 날짜는 YYYY-MM-DD 형식으로 변환합니다.
9. 상대 날짜는 사용자 요청에 제공된
   기준 날짜를 사용하여 계산합니다.
10. 연도가 없는 날짜는 기준 날짜의 연도를 사용합니다.
    단, 명시적으로 다른 연도가 주어지면 그 연도를 사용합니다.

[제약조건 종류]

LEAVE:
휴가, 연차 신청

필수 정보:
employee_name
start_date
end_date

FORBIDDEN_SHIFT:
특정 근무 제외, 금지, 불가능

필수 정보:
employee_name
start_date
end_date
shift

PREFERRED_SHIFT:
특정 근무 선호, 희망

필수 정보:
employee_name
start_date
end_date
shift

MAX_SHIFT:
최대 근무 횟수 제한

필수 정보:
employee_name
start_date
end_date
shift
value

MIN_SHIFT:
최소 근무 횟수 요구

필수 정보:
employee_name
start_date
end_date
shift
value

[근무 종류]

데이, 낮 근무, 주간근무 = DAY
이브닝, 저녁 근무 = EVENING
나이트, 야간근무 = NIGHT

[날짜 해석]

하루만 지정된 경우:
start_date와 end_date를 동일하게 설정합니다.

"12월 한 달", "12월"처럼
월 전체를 의미하는 기간은
12월 1일부터 12월 31일까지입니다.

"내일"은 기준 날짜의 다음 날입니다.

"같은 날"은 앞선 요청에서
명시된 날짜를 참조합니다.

[복합 문장]

여러 직원이 등장하면
직원마다 제약조건을 생성합니다.

같은 직원에게 서로 다른 요청이 있으면
요청마다 별도의 제약조건을 생성합니다.

예:
김민수는 12월 20일부터 22일까지 휴가고
이정석은 12월 21일부터 25일까지 휴가야.

이 경우 LEAVE 제약조건을 2개 생성합니다.

예:
이영희는 12월 20일 데이 선호하고
같은 날 나이트는 제외해줘.

이 경우 PREFERRED_SHIFT 1개와
FORBIDDEN_SHIFT 1개를 생성합니다.

[정보 누락]

예:
김민수 휴가 처리해줘.

직원과 휴가 유형은 알 수 있지만
날짜가 없습니다.

따라서:
need_clarification = true

clarification_message =
"김민수 직원의 휴가 날짜를 알려주세요."

날짜를 임의로 생성하지 않습니다.

예:
최수진 12월 야간근무 최대한 줄여줘.

정확한 최대 근무 횟수가 없습니다.
value를 임의로 결정하지 않고
추가 질문을 요청합니다.

[출력 규칙]

반드시 지정된 JSON 스키마에 맞게 출력합니다.
JSON 이외의 설명은 작성하지 않습니다.
"""


# ==========================================
# 7. Gemini 자연어 파싱 함수
# ==========================================

def parse_with_gemini(
    user_input: str,
    reference_date: Optional[date] = None
) -> ParsedCommand:

    if not isinstance(user_input, str):
        raise ValueError(
            "사용자 입력은 문자열이어야 합니다."
        )

    user_input = user_input.strip()

    if not user_input:
        raise ValueError(
            "사용자 입력이 비어 있습니다."
        )

    if reference_date is None:
        reference_date = date.today()

    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise ValueError(
            ".env 파일에 GOOGLE_API_KEY가 없습니다."
        )

    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=30000, retry_options=types.HttpRetryOptions(attempts=1)),
    )

    try:
        prompt = (
            f"기준 날짜: {reference_date.isoformat()}\n"
            f"사용자 요청: {user_input}"
        )

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=ParsedCommand,
                temperature=0
            )
        )

        if not response.text:
            raise ValueError(
                "Gemini 응답이 비어 있습니다."
            )

        parsed = ParsedCommand.model_validate_json(
            response.text
        )

        return parsed

    finally:
        client.close()


# ==========================================
# 8. 단독 실행 테스트
# ==========================================

if __name__ == "__main__":

    test_input = (
        "김민수는 12월 20일부터 22일까지 휴가고 "
        "이정석은 12월 21일부터 25일까지 휴가야"
    )

    print("[사용자 입력]")
    print(test_input)

    try:
        result = parse_with_gemini(
            test_input,
            reference_date=date(2026, 11, 11)
        )

        print("\n[Gemini 파싱 결과]")
        print(
            result.model_dump_json(
                indent=2,
                exclude_none=True
            )
        )

        print(
            f"\n추출된 제약조건 수: "
            f"{len(result.constraints)}"
        )

        print(
            f"추가 질문 필요: "
            f"{result.need_clarification}"
        )

        if result.need_clarification:
            print(
                "추가 질문:",
                result.clarification_message
            )

    except Exception as e:
        print(
            f"[오류] {type(e).__name__}: {e}"
        )
