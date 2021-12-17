import gdb
gdb.execute('file /')
o = gdb.execute('disassemble exit', to_string=True)
print(o)
gdb.execute('quit')
