import { Edge, EdgeShape } from "../view/Edge";
import { Graph } from "../view/Graph";
import { ScreenCoords, Vertex } from "../view/Vertex";

abstract class Action {
    abstract commit() : void;
    abstract rollback() : void;
}

abstract class UpdatableAction extends Action {
    abstract update(action: this): boolean;
}

class UpdateEdgeShapeAction extends Action {
    edge: Edge;
    old_shape: EdgeShape;
    new_shape: EdgeShape;
    constructor(edge: Edge, edge_shape: EdgeShape) {
        super();
        this.edge = edge;
        this.new_shape = this.old_shape = edge_shape;
    }
    commit() {
        this.edge.shape = this.new_shape;
        this.edge.update();
    }
    rollback() {
        this.edge.shape = this.old_shape;
        this.edge.update();
    }
}

class ClearGraphAction extends Action {
    graph: Graph;
    mol: string;
    constructor(graph: Graph) {
        super();
        this.graph = graph;
        this.mol = "";
    }
    commit() {
        this.mol = this.graph.get_mol_string();
        this.graph.clear();
    }
    rollback() {
        this.graph.load_mol_string(this.mol);
        this.graph.update();
    }
}

class DeleteVertexAction extends Action {
    graph: Graph;
    vertex: Vertex;
    removed: Graph;

    constructor(graph: Graph, vertex: Vertex) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.removed = new Graph();
    }

    commit() {
        this.vertex.active = false;
        this.removed = this.graph.delete_vertex(this.vertex);
    }

    rollback() {
        this.graph.add(this.removed);
        this.graph.update();
    }

}

class DeleteEdgeAction extends Action {
    graph: Graph;
    edge: Edge;
    removed: Graph;

    constructor(graph: Graph, edge: Edge) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.removed = new Graph();
    }

    commit() {
        this.edge.active = false;
        this.removed = this.graph.delete_edge(this.edge);
    }

    rollback() {
        this.graph.add(this.removed);
        this.graph.update();
    }
}

class AddBoundVertexAction extends Action {
    graph: Graph;
    vertex: Vertex;
    added: Graph | null;

    constructor(graph: Graph, vertex: Vertex) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.add_bound_vertex_to(this.vertex);
    }
    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}

class AddDefaultFragmentAction extends Action {
    graph: Graph;
    x: number;
    y: number;
    added: Graph | null;

    constructor(graph: Graph, x: number, y: number ) {
        super();
        this.graph = graph;
        this.x = x;
        this.y = y;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.add_default_fragment({x: this.x, y: this.y});
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }

}

class BindVerticesAction extends Action {
    graph: Graph;
    v1: Vertex;
    v2: Vertex;
    edge: Edge | null;

    constructor(graph: Graph, v1: Vertex, v2: Vertex) {
        super();
        this.graph = graph;
        this.v1 = v1;
        this.v2 = v2;
        this.edge = null;
    }

    commit() {
        this.edge = this.graph.bind_vertices(this.v1, this.v2);
        this.edge.update();
        this.v1.update();
        this.v2.update();
    }

    rollback() {
        if (!this.edge)
            return;
        this.graph.delete_edge(this.edge);
        this.edge = null;
    }
}

class AddChainAction extends Action {
    graph: Graph;
    vertex: Vertex;
    added: Graph | null;
    natoms: number;

    constructor(graph: Graph, vertex: Vertex, natoms: number) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.natoms = natoms;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.add_chain(this.vertex, this.natoms);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}

class AttachRingAction extends Action {
    graph: Graph;
    vertex: Vertex;
    added: Graph | null;
    natoms: number;

    constructor(graph: Graph, vertex: Vertex, natoms: number) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.natoms = natoms;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.attach_ring(this.vertex, this.natoms);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}

class FuseRingAction extends Action {
    graph: Graph;
    edge: Edge;
    added: Graph | null;
    natoms: number;

    constructor(graph: Graph, edge: Edge, natoms: number) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.natoms = natoms;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.fuse_ring(this.edge, this.natoms);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}

class ChangeAtomLabelAction extends UpdatableAction {
    graph: Graph;
    vertex: Vertex;
    old_label: string;
    new_label: string;
    constructor(graph: Graph, vertex: Vertex, label: string) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.old_label = vertex.label;
        this.new_label = label;
    }
    _set_label(label: string) {
        this.vertex.label = label;
        this.vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
    }
    commit() {
        this._set_label(this.new_label);
    }
    rollback() {
        this._set_label(this.old_label);
    }
    update(action: this): boolean {
        if (this.vertex != action.vertex)
            return false;
        this.new_label = action.new_label;
        this._set_label(this.new_label);
        return true;
    }
}

class MoveVertexAction extends UpdatableAction {
    graph: Graph;
    vertex: Vertex;
    old_coords: ScreenCoords;
    new_coords: ScreenCoords;

    constructor(graph: Graph, vertex: Vertex) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.new_coords = this.old_coords = this.vertex.screen_coords;
    }

    commit() : void {
        this.new_coords = this.vertex.screen_coords;
        this.vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
    }

    rollback(): void {
        this.vertex.screen_coords = this.old_coords;
        this.vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
    }

    update(action: this) : boolean {
        if (action.vertex != this.vertex)
            return false;
        this.new_coords = action.vertex.screen_coords;
        this.vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
        return true;
    }
}

export {
    Action,
    UpdatableAction,
    AddBoundVertexAction,
    AddChainAction,
    AddDefaultFragmentAction,
    AttachRingAction,
    BindVerticesAction,
    ChangeAtomLabelAction,
    ClearGraphAction,
    DeleteEdgeAction,
    DeleteVertexAction,
    FuseRingAction,
    MoveVertexAction,
    UpdateEdgeShapeAction,
};