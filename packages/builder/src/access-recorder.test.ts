import { TemplateContext } from './access-recorder';

describe('access-recorder.ts', () => {
  const templateContext = new TemplateContext({ chainId: 45, timestamp: 0, package: { version: '0.0.0' } });
  describe('TemplateContext.computeAccesses()', () => {
    it('computes dependency with addition operation', () => {
      expect(templateContext.computeAccesses('<%= settings.value1 + settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with addition operation using extras', () => {
      expect(templateContext.computeAccesses('<%= extras.value1 + extras.value2 %>')).toEqual({
        accesses: ['extras.value1', 'extras.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with usage of allowed global variables', () => {
      expect(templateContext.computeAccesses('<%= parseEther(String(0.3)) %>')).toEqual({
        accesses: [],
        unableToCompute: false,
      });
    });

    it('computes simple addition', () => {
      expect(templateContext.computeAccesses('<%= 1 + 1 %>')).toEqual({
        accesses: [],
        unableToCompute: false,
      });
    });

    it('computes dependency with subtraction operation', () => {
      expect(templateContext.computeAccesses('<%= settings.value1 - settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with multiplication operation', () => {
      expect(templateContext.computeAccesses('<%= settings.value1 * settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with division operation', () => {
      expect(templateContext.computeAccesses('<%= settings.value1 / settings.value2 %>')).toEqual({
        accesses: ['settings.value1', 'settings.value2'],
        unableToCompute: false,
      });
    });

    it('computes dependency with complex math operation', () => {
      expect(
        templateContext.computeAccesses('<%= (settings.value1 + settings.value2) * settings.value3 / settings.value4 %>')
      ).toEqual({
        accesses: ['settings.value1', 'settings.value2', 'settings.value3', 'settings.value4'],
        unableToCompute: false,
      });
    });

    it('computes multiple dependencies on different template tags', () => {
      expect(templateContext.computeAccesses('<%= settings.woot %>-<%= settings.woot2 %>')).toEqual({
        accesses: ['settings.woot', 'settings.woot2'],
        unableToCompute: false,
      });
    });

    it('computes simple dependency', () => {
      expect(templateContext.computeAccesses('<%= settings.woot %>')).toEqual({
        accesses: ['settings.woot'],
        unableToCompute: false,
      });
    });

    it('computes array dependency', () => {
      expect(
        templateContext.computeAccesses(
          '["<%= settings.camelotSwapPublisherAdmin1 %>","<%= settings.camelotSwapPublisherAdmin2 %>"]'
        )
      ).toEqual({
        accesses: ['settings.camelotSwapPublisherAdmin1', 'settings.camelotSwapPublisherAdmin2'],
        unableToCompute: false,
      });
    });

    it('computes dependency using simple CannonHelperContext', () => {
      expect(templateContext.computeAccesses('<%= parseEther(settings.woot) %>')).toEqual({
        accesses: ['settings.woot'],
        unableToCompute: false,
      });
    });

    it('computes dependency using complex CannonHelperContext', () => {
      expect(
        templateContext.computeAccesses(
          '<%= defaultAbiCoder.encode(parseEther(settings.woot)) %> + <%= defaultAbiCoder.decode(contracts.compound) %>'
        )
      ).toEqual({
        accesses: ['contracts.compound', 'settings.woot'],
        unableToCompute: false,
      });
    });

    it('computes dependency with chainId as a dynamic value search', () => {
      expect(templateContext.computeAccesses('<%= settings[`my_${chainId}`] %>')).toEqual({
        accesses: ['settings.my_45'],
        unableToCompute: false,
      });
    });
  });

  describe('computeTemplateAccesses() syntax validation', () => {
    it('handles invalid template syntax - unmatched brackets', () => {
      expect(templateContext.computeAccesses('<%= settings.value) %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('handles empty template tags', () => {
      expect(templateContext.computeAccesses('<%=%>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('handles multiple template tags with mixed validity', () => {
      expect(templateContext.computeAccesses('<%= settings.valid %> and <% invalid.syntax')).toEqual({
        accesses: ['settings.valid'],
        unableToCompute: false,
      });
    });

    it('handles template with only whitespace', () => {
      expect(templateContext.computeAccesses('<%=   %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });
  });

  describe('computeTemplateAccesses() security', () => {
    it('prevents direct code execution', () => {
      expect(templateContext.computeAccesses('<%= process.exit(1) %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents access to global objects', () => {
      expect(templateContext.computeAccesses('<%= global.process %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents require/import statements', () => {
      expect(templateContext.computeAccesses('<%= require("fs") %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents eval usage', () => {
      expect(templateContext.computeAccesses('<%= eval("console.log(\'REKT\')") %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents Function constructor usage', () => {
      expect(templateContext.computeAccesses('<%= new Function("return process")() %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents setTimeout/setInterval usage', () => {
      expect(templateContext.computeAccesses('<%= setTimeout(() => {}, 1000) %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents overriding console.log', () => {
      expect(
        templateContext.computeAccesses('<%= console.log=function(n){require("fs").writeFileSync("./exploit.log",n)} %>')
      ).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });

    it('prevents assignment of values', () => {
      expect(templateContext.computeAccesses('<%= const value = 1 + 2 %>')).toEqual({
        accesses: [],
        unableToCompute: true,
      });
    });
  });
});
