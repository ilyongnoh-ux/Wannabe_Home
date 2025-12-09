from dataclasses import dataclass
from typing import List, Any

# ==========================================
# 1. 골프 앱 데이터 모델 (표준화됨)
# ==========================================
@dataclass
class GolfData:
    name: str          # user_name -> name 통일
    phone: str         # user_phone -> phone 통일
    current_age: int
    retire_age: int
    assets: int
    saving: int
    rounds: int
    cost: int
    bankruptcy_age: int
    result_msg: str
    memo: str          # [NEW] 공통 필드 추가

    def to_payload(self) -> List[Any]:
        return [
            self.name, self.phone, 
            self.current_age, self.retire_age,
            self.assets, self.saving, 
            self.rounds, self.cost,
            self.bankruptcy_age, self.result_msg,
            self.memo
        ]

# ==========================================
# 2. 세금 앱 데이터 모델
# ==========================================
@dataclass
class TaxData:
    name: str
    phone: str
    real_estate_billions: int
    financial_billions: int
    total_estate_eok: float
    has_spouse_str: str
    spouse_pct: int
    sim_years: int
    inflation_re_pct: float
    inflation_fin_pct: float
    memo: str

    def to_payload(self) -> List[Any]:
        return [
            self.name, self.phone, 
            self.real_estate_billions, self.financial_billions, 
            self.total_estate_eok, 
            self.has_spouse_str, self.spouse_pct, 
            self.sim_years, 
            self.inflation_re_pct, self.inflation_fin_pct, 
            self.memo
        ]

# ==========================================
# 3. 은퇴 앱 데이터 모델
# ==========================================
@dataclass
class LifeData:
    name: str
    phone: str
    age: int
    retire_age: int
    death_age: int
    asset: float
    save: int
    rate_pct: float
    props_str: str
    spend: int
    golf_freq: str
    travel_freq: str
    inflation_pct: float
    score: int
    grade: str
    shortfall_txt: str
    memo: str

    def to_payload(self) -> List[Any]:
        return [
            self.name, self.phone, 
            self.age, self.retire_age, self.death_age,
            self.asset, self.save, self.rate_pct, 
            self.props_str, 
            self.spend, self.golf_freq, self.travel_freq, self.inflation_pct,
            self.score, self.grade, self.shortfall_txt, 
            self.memo
        ]