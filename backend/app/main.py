from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter
from app.models import Node, Edge
from app.simulator import Patient
from typing import Dict, List
import networkx as nx
import numpy as np

# Create a router to define API endpoints
router = APIRouter()

TICKS = 100

@router.post("/simulate")
def simulate_flow(data: dict):
    try:
        # Extract nodes and edges from request payload
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])

        # Create a directed graph for simulation
        G = nx.DiGraph()

        # Add nodes to the graph with their data and type
        for node in nodes:
            G.add_node(node["id"], **node["data"], type=node.get("type"))

        # Add edges to the graph from source to target
        for edge in edges:
            G.add_edge(edge["source"], edge["target"])

        patients: List[Patient] = []
        patient_id = 1

        # Initialize state tracking for each node
        node_state = {
            node_id: {
                "active": [],
                "queue": [],
                "timeline": [0] * TICKS,
                "queue_sizes": [0] * TICKS
            } for node_id in G.nodes
        }

        for tick in range(TICKS):
            # Generate new patients at input nodes based on Poisson distribution
            for node_id, attr in G.nodes(data=True):
                if attr.get("type") == "customInput":
                    lam = attr.get("lambda", 5)
                    lam = max(lam, 25)  # Limit for simulation
                    arrivals = np.random.poisson(lam=lam)
                    for _ in range(arrivals):
                        patient = Patient(f"p{patient_id}", tick, node_id)
                        patients.append(patient)
                        patient_id += 1

            # Advance all patients by one tick
            for patient in patients:
                patient.tick(tick, G, node_state)

            # Record stats for this tick
            for node_id, state in node_state.items():
                state["timeline"][tick] = len(state["active"])
                state["queue_sizes"][tick] = len(state["queue"])

        # Log transactions for each patient
        patient_logs = [
            {
                "patient_id": p.id,
                "transactions": p.transactions
            } for p in patients
        ]

        # Compile statistics for each node
        node_stats = {}
        for node_id, state in node_state.items():
            attr = G.nodes[node_id]
            if sum(state["timeline"]) == 0:
                continue  # Skip nodes with no activity

            node_stats[node_id] = {
                "label": attr.get("label"),
                "type": attr.get("type"),
                "config": {
                    k: v for k, v in attr.items() if k not in {"label", "type"}
                },
                "avg_occupancy": round(np.mean(state["timeline"]), 2),
                "min_queue": int(np.min(state["queue_sizes"])),
                "avg_queue": round(np.mean(state["queue_sizes"]), 2),
                "max_queue": int(np.max(state["queue_sizes"]))
            }

        # Return simulation results
        return {
            "message": "Simulation complete",
            "num_patients": len(patients),
            "patient_logs": patient_logs,
            "node_stats": node_stats
        }

    except Exception as e:
        # Return a 400 error with exception detail if simulation fails
        raise HTTPException(status_code=400, detail=str(e))


# Create FastAPI app with a root path prefix
app = FastAPI(root_path="/api")

# Enable CORS so frontend can communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the router with the FastAPI app
app.include_router(router)
