import pathlib
f=pathlib.Path(chr(68)+chr(58)+chr(47)+chr(99)+chr(97)+chr(116)+chr(115)+chr(116)+chr(97)+chr(114)+chr(114)+chr(121)+chr(46)+chr(120)+chr(121)+chr(122)+chr(47)+chr(65)+chr(71)+chr(69)+chr(78)+chr(84)+chr(83)+chr(46)+chr(109)+chr(100))
t=f.read_text(encoding=chr(117)+chr(116)+chr(102)+chr(45)+chr(56))
rule=chr(10)+chr(10)+chr(10)+chr(35)+chr(35)+chr(35)+chr(32)+chr(101)+chr(110)+chr(99)+chr(111)+chr(100)+chr(105)+chr(110)+chr(103)+chr(45)+chr(103)+chr(117)+chr(97)+chr(114)+chr(100)+chr(114)+chr(97)+chr(105)+chr(108)+chr(32)+chr(45)+chr(45)+chr(45)
f.write_text(t+rule, encoding=chr(117)+chr(116)+chr(102)+chr(45)+chr(56))
print(chr(100)+chr(111)+chr(110)+chr(101))