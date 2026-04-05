from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CrimeIncidentBase(BaseModel):
    dr_no: str
    date_occ: datetime
    year: int
    month: int
    day: int
    hour: int
    quarter: int
    weekday: int
    is_weekend: bool
    is_night: bool
    area: int
    area_name: str
    crm_cd: int
    crm_cd_desc: str
    vict_age: Optional[int] = None
    vict_sex: Optional[str] = None
    lat: float
    lon: float
    lat_bin: int
    lon_bin: int


class CrimeIncidentCreate(CrimeIncidentBase):
    pass


class CrimeIncidentResponse(CrimeIncidentBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class CrimeFilter(BaseModel):
    area_name: Optional[str] = None
    crm_cd_desc: Optional[str] = None
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    month: Optional[int] = None
    hour_from: Optional[int] = None
    hour_to: Optional[int] = None
    is_weekend: Optional[bool] = None


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=100, ge=1, le=1000)
