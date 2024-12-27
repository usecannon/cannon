import { TemplateValidationError, validateTemplate } from './template';

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
});
