import { computeTemplateAccesses } from './access-recorder';

describe('access-recorder.ts', () => {
  describe('computeTemplateAccesses()', () => {
    it('computes dependency with addition operation', () => {
      expect(computeTemplateAccesses('<%= settings.value1 + settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with addition operation using extras', () => {
      expect(computeTemplateAccesses('<%= extras.value1 + extras.value2 %>')).toEqual({
        accesses: ['extras.value1', 'extras.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with usage of allowed global variables', () => {
      expect(computeTemplateAccesses('<%= parseEther(String(0.3)) %>')).toEqual({
        accesses: [],
        unableToCompute: false,
      });
    });

    it('computes simple addition', () => {
      expect(computeTemplateAccesses('<%= 1 + 1 %>')).toEqual({
        accesses: [],
        unableToCompute: false,
      });
    });

    it('computes dependency with subtraction operation', () => {
      expect(computeTemplateAccesses('<%= settings.value1 - settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with multiplication operation', () => {
      expect(computeTemplateAccesses('<%= settings.value1 * settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with division operation', () => {
      expect(computeTemplateAccesses('<%= settings.value1 / settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with complex math operation', () => {
      expect(
        computeTemplateAccesses('<%= (settings.value1 + settings.value2) * settings.value3 / settings.value4 %>')
      ).toEqual({
        accesses: ['settings.value1', 'settings.value2', 'settings.value3', 'settings.value4'],
        unableToCompute: false,
      });
    });

    it('computes multiple dependencies on different template tags', () => {
      expect(computeTemplateAccesses('<%= settings.woot %>-<%= settings.woot2 %>')).toEqual({
        accesses: ['settings.woot', 'settings.woot2'],
        unableToCompute: false,
      });
    });

    it('computes simple dependency', () => {
      expect(computeTemplateAccesses('<%= settings.woot %>')).toEqual({
        accesses: ['settings.woot'],
        unableToCompute: false,
      });
    });

    it('computes array dependency', () => {
      expect(
        computeTemplateAccesses(
          '["<%= settings.camelotSwapPublisherAdmin1 %>","<%= settings.camelotSwapPublisherAdmin2 %>"]'
        )
      ).toEqual({
        accesses: ['settings.camelotSwapPublisherAdmin1', 'settings.camelotSwapPublisherAdmin2'],
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
  });

  describe('computeTemplateAccesses() syntax validation', () => {
    it('handles invalid template syntax - unmatched brackets', () => {
      expect(computeTemplateAccesses('<%= settings.value) %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('handles empty template tags', () => {
      expect(computeTemplateAccesses('<%=%>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('handles multiple template tags with mixed validity', () => {
      expect(computeTemplateAccesses('<%= settings.valid %> and <% invalid.syntax')).toEqual({
        accesses: ['settings.valid'],
        unableToCompute: false,
      });
    });

    it('handles template with only whitespace', () => {
      expect(computeTemplateAccesses('<%=   %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });
  });

  describe('computeTemplateAccesses() security', () => {
    it('prevents direct code execution', () => {
      expect(computeTemplateAccesses('<%= process.exit(1) %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents access to global objects', () => {
      expect(computeTemplateAccesses('<%= global.process %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents require/import statements', () => {
      expect(computeTemplateAccesses('<%= require("fs") %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents eval usage', () => {
      expect(computeTemplateAccesses('<%= eval("console.log(\'REKT\')") %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents Function constructor usage', () => {
      expect(computeTemplateAccesses('<%= new Function("return process")() %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents setTimeout/setInterval usage', () => {
      expect(computeTemplateAccesses('<%= setTimeout(() => {}, 1000) %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents overriding console.log', () => {
      expect(
        computeTemplateAccesses('<%= console.log=function(n){require("fs").writeFileSync("./exploit.log",n)} %>')
      ).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents assignment of values', () => {
      expect(computeTemplateAccesses('<%= const value = 1 + 2 %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });
  });
});
