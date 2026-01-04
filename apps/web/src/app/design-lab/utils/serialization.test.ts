
import { serializeCanvas, applyViewState } from './serialization';
import { Layer } from '@/types/design-lab';

jest.mock('uuid', () => ({
    v4: () => 'test-uuid-1234'
}));

// Mock Fabric module
jest.mock('fabric', () => {
    return {
        Image: class {
            constructor(el, opts) { Object.assign(this, opts); }
        },
        IText: class {
            constructor(text, opts) { this.text = text; Object.assign(this, opts); }
        },
    };
});

describe('Serialization Utils', () => {
    describe('serializeCanvas', () => {
        it('should serialize fabric objects to layers', () => {
            const mockObjects = [
                {
                    type: 'i-text',
                    left: 100,
                    top: 200,
                    scaleX: 1,
                    scaleY: 1,
                    angle: 45,
                    text: 'Hello',
                    fontFamily: 'Arial',
                    visible: true,
                    fill: '#000000',
                    toObject: () => ({}),
                },
                {
                    type: 'image',
                    left: 50,
                    top: 50,
                    getSrc: () => 'http://example.com/image.png',
                    visible: true,
                }
            ];

            const mockCanvas = {
                getObjects: () => mockObjects,
            };

            const layers = serializeCanvas(mockCanvas);

            expect(layers).toHaveLength(2);
            expect(layers[0].type).toBe('text');
            expect(layers[0].text).toBe('Hello');
            expect(layers[0].transform.x).toBe(100);
            expect(layers[0].transform.rotation).toBe(45);

            expect(layers[1].type).toBe('image');
            expect(layers[1].src).toBe('http://example.com/image.png');
        });

        it('should ignore guide/background objects', () => {
            const mockObjects = [
                { name: 'printable-area-group', type: 'group' },
                { name: 'product-image-base', type: 'image' },
                { type: 'i-text', text: 'Valid' }
            ];

            const mockCanvas = {
                getObjects: () => mockObjects,
            };

            const layers = serializeCanvas(mockCanvas);
            expect(layers).toHaveLength(1);
            expect(layers[0].text).toBe('Valid');
        });
    });
});
