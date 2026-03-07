import { AccessRecorderEngine } from './access-recorder';

describe('access-recorder.ts', () => {
  const engine = new AccessRecorderEngine([]);
  describe('computeTemplateAccesses()', () => {
    it('computes dependency with addition operation', () => {
      expect(engine.computeTemplateAccesses('<%= settings.value1 + settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with addition operation using extras', () => {
      expect(engine.computeTemplateAccesses('<%= extras.value1 + extras.value2 %>')).toEqual({
        accesses: ['extras.value1', 'extras.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with usage of allowed global variables', () => {
      expect(engine.computeTemplateAccesses('<%= parseEther(String(0.3)) %>')).toEqual({
        accesses: [],
        unableToCompute: false,
      });
    });

    it('computes simple addition', () => {
      expect(engine.computeTemplateAccesses('<%= 1 + 1 %>')).toEqual({
        accesses: [],
        unableToCompute: false,
      });
    });

    it('computes dependency with subtraction operation', () => {
      expect(engine.computeTemplateAccesses('<%= settings.value1 - settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with multiplication operation', () => {
      expect(engine.computeTemplateAccesses('<%= settings.value1 * settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with division operation', () => {
      expect(engine.computeTemplateAccesses('<%= settings.value1 / settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with complex math operation', () => {
      expect(
        engine.computeTemplateAccesses('<%= (settings.value1 + settings.value2) * settings.value3 / settings.value4 %>')
      ).toEqual({
        accesses: ['settings.value1', 'settings.value2', 'settings.value3', 'settings.value4'],
        unableToCompute: false,
      });
    });

    it('computes multiple dependencies on different template tags', () => {
      expect(engine.computeTemplateAccesses('<%= settings.woot %>-<%= settings.woot2 %>')).toEqual({
        accesses: ['settings.woot', 'settings.woot2'],
        unableToCompute: false,
      });
    });

    it('computes simple dependency', () => {
      expect(engine.computeTemplateAccesses('<%= settings.woot %>')).toEqual({
        accesses: ['settings.woot'],
        unableToCompute: false,
      });
    });

    it('computes array dependency', () => {
      expect(
        engine.computeTemplateAccesses(
          '["<%= settings.camelotSwapPublisherAdmin1 %>","<%= settings.camelotSwapPublisherAdmin2 %>"]'
        )
      ).toEqual({
        accesses: ['settings.camelotSwapPublisherAdmin1', 'settings.camelotSwapPublisherAdmin2'],
        unableToCompute: false,
      });
    });

    it('computes dependency using simple CannonHelperContext', () => {
      expect(engine.computeTemplateAccesses('<%= parseEther(settings.woot) %>')).toEqual({
        accesses: ['settings.woot'],
        unableToCompute: false,
      });
    });

    it('computes dependency using complex CannonHelperContext', () => {
      expect(
        engine.computeTemplateAccesses(
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
      expect(engine.computeTemplateAccesses('<%= settings.value) %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('handles empty template tags', () => {
      expect(engine.computeTemplateAccesses('<%=%>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('handles multiple template tags with mixed validity', () => {
      expect(engine.computeTemplateAccesses('<%= settings.valid %> and <% invalid.syntax')).toEqual({
        accesses: ['settings.valid'],
        unableToCompute: false,
      });
    });

    it('handles template with only whitespace', () => {
      expect(engine.computeTemplateAccesses('<%=   %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });
  });

  describe('computeTemplateAccesses() security', () => {
    it('prevents direct code execution', () => {
      expect(engine.computeTemplateAccesses('<%= process.exit(1) %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents access to global objects', () => {
      expect(engine.computeTemplateAccesses('<%= global.process %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents require/import statements', () => {
      expect(engine.computeTemplateAccesses('<%= require("fs") %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents eval usage', () => {
      expect(engine.computeTemplateAccesses('<%= eval("console.log(\'REKT\')") %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents Function constructor usage', () => {
      expect(engine.computeTemplateAccesses('<%= new Function("return process")() %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents setTimeout/setInterval usage', () => {
      expect(engine.computeTemplateAccesses('<%= setTimeout(() => {}, 1000) %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents overriding console.log', () => {
      expect(
        engine.computeTemplateAccesses('<%= console.log=function(n){require("fs").writeFileSync("./exploit.log",n)} %>')
      ).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents assignment of values', () => {
      expect(engine.computeTemplateAccesses('<%= const value = 1 + 2 %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });
  });
});
