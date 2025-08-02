import numpy as np
import random
from typing import Dict
import networkx as nx

class Patient:
    def __init__(self, id: str, arrival_tick: int, start_node: str):
        self.id = id
        self.arrival_tick = arrival_tick
        self.current_node = None
        self.next_node = start_node
        self.status = 'waiting'
        self.enter_tick = None
        self.exit_tick = None
        self.queued = False
        self.transactions = []

    def is_active(self):
        return self.status != 'done'

    def tick(self, tick: int, graph: nx.DiGraph, node_state: Dict[str, Dict]):
        if self.status == 'done' or tick < self.arrival_tick:
            return

        if self.current_node is None and self.next_node:
            self._enter_node(tick, graph, node_state)

        elif self.status == 'treating' and tick >= self.exit_tick:

            label = graph.nodes[self.current_node].get("label", self.current_node)
            self.transactions.append({
                "node": self.current_node,
                "label": label,
                "enter": self.enter_tick,
                "exit": self.exit_tick,
                "queued": self.queued
            })

            node_state[self.current_node]["active"].remove(self)
            self.current_node = None
            self.enter_tick = None
            self.exit_tick = None
            self.queued = False
            self.status = 'waiting'

            successors = list(graph.successors(self.transactions[-1]["node"]))
            if not successors or graph.nodes[successors[0]].get("type") == "customOutput":
                self.status = 'done'
                self.next_node = None
            else:
                self.next_node = random.choice(successors)

    def _enter_node(self, tick, graph, node_state):
        node = self.next_node
        data = graph.nodes[node]
        capacity = data.get("bedCapacity") or data.get("orCapacity") or float('inf')

        if self not in node_state[node]["queue"] and len(node_state[node]["active"]) >= capacity:
            node_state[node]["queue"].append(self)
            self.queued = True
            return

        #Start treatment if available
        if len(node_state[node]["active"]) < capacity:
            if self in node_state[node]["queue"]:
                node_state[node]["queue"].remove(self)

            self.status = 'treating'
            self.current_node = node
            self.next_node = None
            self.enter_tick = tick

            stay = max(1, int(np.random.normal(data.get("avgStay", 1), data.get("avgStd", 0.1))))
            self.exit_tick = tick + stay

            node_state[node]["active"].append(self)

