import { TemplateValidationError, validateTemplate, renderTemplate, template } from './template';

describe('template.ts', () => {
  describe('validateTemplate()', () => {
    it.each([
      '<%= a = 1 %>',
      '<%= a += 1 %>',
      '<%= a -= 1 %>',
      '<%= a *= 1 %>',
      '<%= a /= 1 %>',
      '<%= a++ %>',
      '<%= a-- %>',
      '<%= a %= 1 %>',
      '<%= a <<= 1 %>',
      '<%= a >>= 1 %>',
      '<%= a >>>= 1 %>',
      '<%= a &= 1 %>',
      '<%= a |= 1 %>',
      '<%= a ^= 1 %>',
      '<%= a **= 1 %>',
      '<%= a &&= 1 %>',
      '<%= a ||= 1 %>',
      '<%= a ??= 1 %>',
    ])('does not allow assignment operator: "%s"', (template) => {
      expect(() => validateTemplate(template)).toThrow(TemplateValidationError);
    });

    it.each([
      '<%= process.exit(1) %>',
      "<%= console.log(this), 'new greeting' %>",
      "<%= console.log(process.env), 'some value' %>",
      '<%= global.process %>',
      '<%= require("fs") %>',
      '<%= eval("console.log(\'REKT\')") %>',
      '<%= new Function("return process")() %>',
      '<%= setTimeout(() => {}, 1000) %>',
      '<%= console.log=function(n){require("fs").writeFileSync("./exploit.log",n)} %>',
      '<%= const value = 1 + 2 %>',
      '<%= value=1+2 %>',
      '<%= value++ %>',
      '<%= globalThis["process"] %>',
      '<%= globalThis %>',
    ])('does not allow invalid globals: "%s"', (template) => {
      expect(() => validateTemplate(template)).toThrow(TemplateValidationError);
    });

    it.each(['<%= settings.value) %>', '<%= settings.value === %>'])('throws a SyntaxError: "%s"', (template) => {
      expect(() => validateTemplate(template)).toThrow(SyntaxError);
    });

    it.each([
      '<%=%>',
      '<%=   %>',
      '<%= package.version %>',
      '<%= chainId %>',
      '<%= timestamp %>',
      '<%=settings.value%>',
      '<%= settings.value === 1 %>',
      '<%=settings.value1%>-<%=settings.value2%>',
      '<%= settings.value1 + settings.value2 %>',
      '<%= settings.value1 - settings.value2 %>',
      '<%= settings.value1 * settings.value2 %>',
      '<%= settings.value1 / settings.value2 %>',
      '<%= settings.value1 %>',
      '<%= settings.value1.value2 %>',
      '<%= settings.value1[0] %>',
      '<%= settings.value1[0].value2 %>',
      '<%= (settings.value1 + settings.value2) * settings.value3 / settings.value4 %>',
      '<%= defaultAbiCoder.encode(parseEther(settings.woot)) %> + <%= defaultAbiCoder.decode(contracts.compound) %>',
    ])('is valid: "%s"', (template) => {
      expect(validateTemplate(template)).toBeUndefined();
    });
  });

  describe('template()', () => {
    it.each<[string, any, string]>([
      ['<%= settings.woot %>', { settings: { woot: 'woot' } }, 'woot'],
      ['<%= a %>-<%= b %>', { a: 'one', b: 'two' }, 'one-two'],
      ['[<%= JSON.stringify(a) %>]', { a: { one: 1, two: '2', three: [3] } }, '[{"one":1,"two":"2","three":[3]}]'],
    ])('is valid: "%s"', (str, ctx, expected) => {
      // Make sure the rendering has the same result inside the ses compartment
      expect(renderTemplate(str, ctx)).toEqual(expected);
      expect(template(str, ctx)).toEqual(expected);
    });
  });
});
