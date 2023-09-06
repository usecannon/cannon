const def = {
  name: 'greeter-generated',
  version: '1.0.0',
  contract: {
    Library: { artifact: 'Library' },
  },
};

const greetings = ['one', 'two', 'three', 'four', 'five'];

for (const i in greetings) {
  def.contract['Greeter' + i] = {
    artifact: 'Greeter',
    libraries: { Library: '<%= contracts.Library.address %>' },
    args: ['a new greeting: ' + greetings[i]],
    depends: ['contract.Library'],
  };
}

process.stdout.write(JSON.stringify(def));
