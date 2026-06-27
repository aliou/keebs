CFLAGS = -O2 -Wall -Wextra
LDFLAGS = -framework ApplicationServices -framework CoreFoundation

tracer: tracer.c
	$(CC) $(CFLAGS) -o $@ $< $(LDFLAGS)

clean:
	rm -f tracer

.PHONY: clean
