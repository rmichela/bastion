import { ChronoTree, Node, Storage, NodeType, Hash, NodeMap } from '../src/chronoTree';
import { TestStorage, TestNode } from './testStorage';
import { expect } from 'chai';
import { RNG } from './rng';
import * as h from 'object-hash';

describe('ChronoTree Simulation', () => {
    it('should process 100 random operations, merging every iteration', function(done: () => void): void {
        this.timeout(20000);
        let r: RNG = new RNG(1);

        // create the first post
        let storage: Storage = new TestStorage(false);
        let rootNode: TestNode = new TestNode();
        rootNode.content = '-1';
        rootNode.hash = storage.save(rootNode);

        // create the three ChronoTrees initialized to the root node
        let trees: ChronoTree[] = [
            new ChronoTree(storage, rootNode.hash, 'A'),
            new ChronoTree(storage, rootNode.hash, 'B'),
            new ChronoTree(storage, rootNode.hash, 'C')
            ];

        function changeThenMerge(i: number): void {
            console.log('Iteration: ' + i.toString());
            for (let t: number = 0; t < trees.length; t++) {
                // pick a random known node to be the parent
                let p: Hash = r.pick(contentHashes(trees[t].knownNodes));
                // create a new node
                let n: TestNode = new TestNode();
                n.content = i.toString();
                n.parent = p;
                // add the new node
                trees[t].add(n);
            }

            // merge each pair of trees together
            for (let treePair of combineAll(trees)) {
                treePair[0].merge(treePair[1].bitterEnd);
            }

            // assert all the trees are the same
            for (let treePair of combine(trees)) {
                ctCompare(treePair[0], treePair[1]);
            }
        }

        bounce(changeThenMerge, 100, done);
    });

    it('should process 100 random operations, merging randomly', (done) => {
        let r: RNG = new RNG(1);

        // create the first post
        let storage: Storage = new TestStorage(false);
        let rootNode: TestNode = new TestNode();
        rootNode.content = '-1';
        rootNode.hash = storage.save(rootNode);

        // create the three ChronoTrees initialized to the root node
        let trees: ChronoTree[] = [
            new ChronoTree(storage, rootNode.hash, 'A'),
            new ChronoTree(storage, rootNode.hash, 'B'),
            new ChronoTree(storage, rootNode.hash, 'C')
            ];

        function changeThenMerge(i: number): void {
            console.log('Iteration: ' + i.toString());
            for (let t: number = 0; t < trees.length; t++) {
                // sometimes add a new node to the tree
                if (r.nextInt(0, 2) === 0) {
                    // pick a random known node to be the parent
                    let p: Hash = r.pick(contentHashes(trees[t].knownNodes));
                    // create a new node
                    let n: TestNode = new TestNode();
                    n.content = i.toString();
                    n.parent = p;
                    // add the new node
                    trees[t].add(n);
                    console.log(trees[t].name + ' <- ' + n.hash);
                }
            }

            // sometimes merge a pair of trees together
            for (let treePair of combineAll(trees)) {
                if (r.nextInt(0, 4) === 0) {
                    console.log(treePair[1].name + ' -> ', treePair[0].name);
                    treePair[0].merge(treePair[1].bitterEnd);
                }
            }
        }

        function compare(): void {
            // merge each pair of trees together for a final time
            for (let treePair of combineAll(trees)) {
                treePair[0].merge(treePair[1].bitterEnd);
            }

            // assert all the trees are the same
            for (let treePair of combine(trees)) {
                ctCompare(treePair[0], treePair[1]);
            }
            done();
        }

        bounce(changeThenMerge, 100, compare);
    });
});

// select every distinct pair from the input array
function combine<T>(arrIn: T[]): [T, T][] {
    let arrOut: [T, T][] = [];
    for (let i: number = 0; i < arrIn.length; i++) {
        for (let j: number = i + 1; j < arrIn.length; j++) {
            if (arrIn[i] !== arrIn[j]) {
                arrOut.push([arrIn[i], arrIn[j]]);
            }
        }
    }
    return arrOut;
}

// select every pair from the input array
function combineAll<T>(arrIn: T[]): [T, T][] {
    let arrOut: [T, T][] = [];
    for (let i: number = 0; i < arrIn.length; i++) {
        for (let j: number = 0; j < arrIn.length; j++) {
            if (arrIn[i] !== arrIn[j]) {
                arrOut.push([arrIn[i], arrIn[j]]);
            }
        }
    }
    return arrOut;
}

function contentHashes(nodeMap: NodeMap): Hash[] {
    let ret: Hash[] = [];
    for (let k in nodeMap) {
        if (nodeMap.hasOwnProperty(k)) {
            let n: Node = nodeMap[k];
            if (n.type === NodeType.Content) {
                ret.push(n.hash);
            }
        }
    }
    return ret;
}

function ctCompare(lhs: ChronoTree, rhs: ChronoTree): void {
    console.log(lhs.name + ' <-> ' + rhs.name);
    // verify ends are the same
    expect(lhs.bitterEnd).to.equal(rhs.bitterEnd);
    // verify internal state is the same
    expect(h.sha1(lhs.looseEnds)).to.equal(h.sha1(rhs.looseEnds));

    if (h.sha1(lhs.knownNodes) !== h.sha1(rhs.knownNodes)) {
        console.log('============================');
        lhs.debugPrint();
        console.log('============================');
        rhs.debugPrint();
        console.log('============================');
    }

    expect(h.sha1(lhs.knownNodes)).to.equal(h.sha1(rhs.knownNodes));
}

function bounce(func: (i: number) => void, times: number, after: () => void = null): void {
    let curry = function(i: number): void {
        if (i--) {
            func(i);
            process.nextTick(function(): void {curry(i); });
        } else if (after) {
            process.nextTick(after);
        }
    };
    process.nextTick(function(): void {curry(times); });
}
