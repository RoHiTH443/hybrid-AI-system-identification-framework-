from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db, Experiment
from datetime import datetime
import json

router = APIRouter()


class ExperimentCreate(BaseModel):
    model_config = {"populate_by_name": True}  # pydantic v2 config dict

    name: str
    system_name: Optional[str] = ""
    dataset_config: Optional[str] = "{}"
    model_cfg: Optional[str] = Field("{}", alias="model_config")
    training_params: Optional[str] = "{}"
    test_metrics: Optional[str] = "{}"
    simulation_settings: Optional[str] = "{}"


@router.get("/")
def list_experiments(db: Session = Depends(get_db)):
    exps = db.query(Experiment).order_by(Experiment.created_at.desc()).all()
    return [
        {
            "id": e.id, "name": e.name, "system_name": e.system_name,
            "dataset_config": e.dataset_config, "model_config": e.model_config,
            "training_params": e.training_params, "test_metrics": e.test_metrics,
            "simulation_settings": e.simulation_settings,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "updated_at": e.updated_at.isoformat() if e.updated_at else None,
        }
        for e in exps
    ]


@router.post("/")
def create_experiment(exp: ExperimentCreate, db: Session = Depends(get_db)):
    db_exp = Experiment(
        name=exp.name, system_name=exp.system_name,
        dataset_config=exp.dataset_config, model_config=exp.model_cfg,
        training_params=exp.training_params, test_metrics=exp.test_metrics,
        simulation_settings=exp.simulation_settings,
        created_at=datetime.utcnow(), updated_at=datetime.utcnow(),
    )
    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)
    return {"id": db_exp.id, "name": db_exp.name}


@router.get("/{exp_id}")
def get_experiment(exp_id: int, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(404, "Experiment not found")
    return {"id": exp.id, "name": exp.name, "system_name": exp.system_name,
            "dataset_config": exp.dataset_config, "model_config": exp.model_config,
            "training_params": exp.training_params, "test_metrics": exp.test_metrics}


@router.put("/{exp_id}")
def update_experiment(exp_id: int, exp: ExperimentCreate, db: Session = Depends(get_db)):
    db_exp = db.query(Experiment).filter(Experiment.id == exp_id).first()
    if not db_exp:
        raise HTTPException(404, "Experiment not found")
    field_map = {
        "name": exp.name, "system_name": exp.system_name,
        "dataset_config": exp.dataset_config, "model_config": exp.model_cfg,
        "training_params": exp.training_params, "test_metrics": exp.test_metrics,
        "simulation_settings": exp.simulation_settings,
    }
    for field, val in field_map.items():
        if val is not None:
            setattr(db_exp, field, val)
    db_exp.updated_at = datetime.utcnow()
    db.commit()
    return {"id": db_exp.id, "status": "updated"}


@router.delete("/{exp_id}")
def delete_experiment(exp_id: int, db: Session = Depends(get_db)):
    db_exp = db.query(Experiment).filter(Experiment.id == exp_id).first()
    if not db_exp:
        raise HTTPException(404, "Experiment not found")
    db.delete(db_exp)
    db.commit()
    return {"status": "deleted"}


@router.post("/export/{exp_id}")
def export_experiment(exp_id: int, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(404, "Experiment not found")
    return {
        "name": exp.name, "system_name": exp.system_name,
        "dataset_config": json.loads(exp.dataset_config or "{}"),
        "model_config": json.loads(exp.model_config or "{}"),
        "training_params": json.loads(exp.training_params or "{}"),
        "test_metrics": json.loads(exp.test_metrics or "{}"),
        "simulation_settings": json.loads(exp.simulation_settings or "{}"),
        "exported_at": datetime.utcnow().isoformat(),
    }
