import { computeTemplateAccesses } from './access-recorder';

describe('access-recorder.ts', () => {
  describe('computeTemplateAccesses()', () => {
    it('computes simple dependency', () => {
      expect(computeTemplateAccesses('<%= settings.woot %>')).toEqual({
        accesses: ['settings.woot'],
        unableToCompute: false,
      });
    });

    it('computes dependency using simple CannonHelperContext', () => {
      expect(computeTemplateAccesses('<%= parseEther(settings.woot) %>')).toEqual({
        accesses: ['settings.woot'],
        unableToCompute: false,
      });
    });

    it('computes dependency using complex CannonHelperContext', () => {
      expect(
        computeTemplateAccesses(
          '<%= defaultAbiCoder.encode(parseEther(settings.woot)) %> + <%= defaultAbiCoder.decode(contracts.compound) %>'
        )
      ).toEqual({
        accesses: ['contracts.compound', 'settings.woot'],
        unableToCompute: false,
      });
    });

    it('recognizes whene dependencies are not found', () => {
      expect(computeTemplateAccesses('<%= contracts.hello %><%= sophistication(settings.woot) %>')).toEqual({
        accesses: ['contracts.hello'],
        unableToCompute: true,
      });
    });
  });
});
